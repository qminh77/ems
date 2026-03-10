import type { Express } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import multer from "multer";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import archiver from "archiver";
import { Readable } from "stream";
import { insertAttendeeSchema } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { checkEventAccess } from "../middleware/eventAccess";
import { ensureUniqueQRCode } from "../services/qrService";
import { canManageAttendees } from "../services/accessControl";
import { cacheManager } from "../cacheManager";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export function registerAttendeeRoutes(app: Express) {
  app.get("/api/events/:eventId/attendees", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId, 10);
      const requestedLimit = parseInt(req.query.limit as string, 10) || 1000;
      const requestedOffset = parseInt(req.query.offset as string, 10) || 0;
      const limit = Math.min(Math.max(requestedLimit, 1), 1000);
      const offset = Math.max(requestedOffset, 0);

      const attendees = await storage.getAttendeesByEventId(eventId, limit, offset);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/events/:eventId/attendees", isAuthenticated, checkEventAccess, async (req: any, res) => {
    if (!canManageAttendees(req.eventAccess)) {
      return res.status(403).json({ message: "Bạn không có quyền thêm sinh viên" });
    }
    try {
      const eventId = parseInt(req.params.eventId, 10);
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ message: "MSSV/MSNV là bắt buộc" });
      }

      const qrCode = await ensureUniqueQRCode();
      const qrDataUrl = await QRCode.toDataURL(qrCode);

      const attendeeData = insertAttendeeSchema.parse({
        ...req.body,
        eventId,
        qrCode,
        qrPath: qrDataUrl,
      });

      const attendee = await storage.createAttendee(attendeeData);
      cacheManager.invalidatePattern("stats:");
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error creating attendee:", error);
      res.status(400).json({ message: "Failed to create attendee" });
    }
  });

  app.put("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const attendeeId = parseInt(req.params.id, 10);
      if (Number.isNaN(attendeeId)) {
        return res.status(400).json({ message: "ID sinh viên không hợp lệ" });
      }

      const attendee = await storage.getAttendeeById(attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Không tìm thấy sinh viên" });
      }

      const userId = req.user?.claims?.sub;
      const access = await storage.checkEventAccess(attendee.eventId, userId);
      if (!access.hasAccess || !canManageAttendees(access)) {
        return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa sinh viên" });
      }

      const attendeeData = insertAttendeeSchema.partial().parse(req.body);
      const updatedAttendee = await storage.updateAttendee(attendeeId, attendeeData);
      if (!updatedAttendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.json(updatedAttendee);
    } catch (error) {
      console.error("Error updating attendee:", error);
      res.status(400).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const attendeeId = parseInt(req.params.id, 10);
      if (Number.isNaN(attendeeId)) {
        return res.status(400).json({ message: "ID sinh viên không hợp lệ" });
      }

      const attendee = await storage.getAttendeeById(attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Không tìm thấy sinh viên" });
      }

      const userId = req.user?.claims?.sub;
      const access = await storage.checkEventAccess(attendee.eventId, userId);
      if (!access.hasAccess || !canManageAttendees(access)) {
        return res.status(403).json({ message: "Bạn không có quyền xóa sinh viên" });
      }

      if (attendee.qrPath) {
        const fullPath = path.join(process.cwd(), attendee.qrPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      const success = await storage.deleteAttendee(attendeeId);
      if (!success) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      cacheManager.invalidatePattern("stats:");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendee:", error);
      res.status(500).json({ message: "Failed to delete attendee" });
    }
  });

  app.delete("/api/attendees/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { attendeeIds } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
        return res.status(400).json({ message: "Danh sách ID sinh viên không hợp lệ" });
      }

      const attendees = await storage.getAttendeesByIds(attendeeIds);
      const attendeesByEvent = new Map<number, typeof attendees>();

      for (const attendee of attendees) {
        const eventAttendees = attendeesByEvent.get(attendee.eventId) || [];
        eventAttendees.push(attendee);
        attendeesByEvent.set(attendee.eventId, eventAttendees);
      }

      const allowedEventIds = new Set<number>();
      const deniedEventIds = new Set<number>();

      for (const eventId of Array.from(attendeesByEvent.keys())) {
        const access = await storage.checkEventAccess(eventId, userId);
        if (access.hasAccess && canManageAttendees(access)) {
          allowedEventIds.add(eventId);
        } else {
          deniedEventIds.add(eventId);
        }
      }

      const attendeesToDelete = attendees.filter((attendee) => allowedEventIds.has(attendee.eventId));
      const validIds = attendeesToDelete.map((attendee) => attendee.id);

      if (validIds.length === 0) {
        return res.status(403).json({ message: "Bạn không có quyền xóa những sinh viên này" });
      }

      for (const attendee of attendeesToDelete) {
        if (attendee.qrPath) {
          const fullPath = path.join(process.cwd(), attendee.qrPath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (error) {
              console.error(`Failed to delete QR file for attendee ${attendee.id}:`, error);
            }
          }
        }
      }

      const result = await storage.deleteMultipleAttendees(validIds);
      cacheManager.invalidatePattern("stats:");

      res.json({
        message: `Đã xóa thành công ${result.deletedCount}/${attendeeIds.length} sinh viên`,
        deletedCount: result.deletedCount,
        totalRequested: attendeeIds.length,
        errors: [
          ...result.errors,
          ...(deniedEventIds.size > 0 ? [`Khong du quyen xoa sinh vien trong ${deniedEventIds.size} su kien`] : []),
        ],
      });
    } catch (error) {
      console.error("Error bulk deleting attendees:", error);
      res.status(500).json({ message: "Lỗi khi xóa sinh viên" });
    }
  });

  app.get("/api/attendees/:id/qr", isAuthenticated, async (req: any, res) => {
    const attendeeId = parseInt(req.params.id, 10);

    try {
      const attendee = await storage.getAttendeeById(attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Sinh viên không tồn tại" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const access = await storage.checkEventAccess(attendee.eventId, userId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Ban khong co quyen xem ma QR cua sinh vien nay" });
      }

      if (!attendee.qrCode || !attendee.qrPath) {
        const qrCode = await ensureUniqueQRCode();
        const qrDataUrl = await QRCode.toDataURL(qrCode);

        await storage.updateAttendee(attendeeId, {
          qrCode,
          qrPath: qrDataUrl,
        });

        return res.json({ qrCode: qrDataUrl });
      }

      if (attendee.qrPath.startsWith("data:")) {
        return res.json({ qrCode: attendee.qrPath });
      }

      const qrDataUrl = await QRCode.toDataURL(attendee.qrCode);
      return res.json({ qrCode: qrDataUrl });
    } catch (error) {
      console.error("Get QR error:", error);
      res.status(500).json({ message: "Lỗi khi lấy mã QR" });
    }
  });

  app.get("/api/events/:eventId/attendees/export", isAuthenticated, async (req: any, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = req.user?.claims?.sub;

    try {
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Sự kiện không tồn tại" });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Không có quyền thao tác" });
      }

      const attendees = await storage.getAttendeesByEventId(eventId);
      const excelData = attendees.map((attendee, index) => ({
        STT: index + 1,
        Tên: attendee.name,
        "MSSV/MSNV": attendee.studentId || "",
        Email: attendee.email || "",
        Khoa: attendee.faculty || "",
        Ngành: attendee.major || "",
        "Mã QR": attendee.qrCode || "",
        "Trạng thái": attendee.status === "checked_in" ? "Đã check-in" : attendee.status === "checked_out" ? "Đã check-out" : "Chờ check-in",
        "Thời gian check-in": attendee.checkinTime ? new Date(attendee.checkinTime).toLocaleString("vi-VN") : "",
        "Thời gian check-out": attendee.checkoutTime ? new Date(attendee.checkoutTime).toLocaleString("vi-VN") : "",
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách sinh viên");

      ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const fileName = `DS_SinhVien_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Lỗi khi xuất file" });
    }
  });

  app.get("/api/events/:eventId/attendees/export-zip", isAuthenticated, async (req: any, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    const userId = req.user?.claims?.sub;

    try {
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Sự kiện không tồn tại" });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Không có quyền thao tác" });
      }

      const attendees = await storage.getAttendeesByEventId(eventId);
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-export-"));

      try {
        const excelData = attendees.map((attendee, index) => {
          const formattedName = attendee.name.split(" ").join("_");
          return {
            STT: index + 1,
            Tên: attendee.name,
            "MSSV/MSNV": attendee.studentId || "",
            Email: attendee.email || "",
            Khoa: attendee.faculty || "",
            Ngành: attendee.major || "",
            "Mã QR": attendee.qrCode || "",
            "File QR": attendee.qrCode ? `qr-codes/${formattedName}_${attendee.qrCode}.png` : "",
            "Trạng thái": attendee.status === "checked_in" ? "Đã check-in" : attendee.status === "checked_out" ? "Đã check-out" : "Chờ check-in",
            "Thời gian check-in": attendee.checkinTime ? new Date(attendee.checkinTime).toLocaleString("vi-VN") : "",
            "Thời gian check-out": attendee.checkoutTime ? new Date(attendee.checkoutTime).toLocaleString("vi-VN") : "",
          };
        });

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh sách sinh viên");
        ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

        const excelFileName = `DS_SinhVien_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.xlsx`;
        const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const excelPath = path.join(tempDir, excelFileName);
        fs.writeFileSync(excelPath, excelBuffer);

        const qrDir = path.join(tempDir, "qr-codes");
        fs.mkdirSync(qrDir);

        for (const attendee of attendees) {
          if (attendee.qrCode) {
            const formattedName = attendee.name.split(" ").join("_");
            const qrImagePath = path.join(qrDir, `${formattedName}_${attendee.qrCode}.png`);
            await QRCode.toFile(qrImagePath, attendee.qrCode);
          }
        }

        const zipFileName = `DS_SinhVien_QR_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.zip`;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${zipFileName}"`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
          throw err;
        });

        archive.pipe(res);
        archive.file(excelPath, { name: excelFileName });
        archive.directory(qrDir, "qr-codes");
        await archive.finalize();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error("Export ZIP error:", error);
      res.status(500).json({ message: "Lỗi khi xuất file ZIP" });
    }
  });

  app.get("/api/attendees/template", (_req, res) => {
    const templateData = [
      {
        Tên: "Nguyễn Văn A",
        "MSSV/MSNV": "SV001",
        Email: "nguyenvana@example.com",
        Khoa: "Công nghệ thông tin",
        Ngành: "Kỹ thuật phần mềm",
      },
      {
        Tên: "Trần Thị B",
        "MSSV/MSNV": "SV002",
        Email: "tranthib@example.com",
        Khoa: "Kinh tế",
        Ngành: "Quản trị kinh doanh",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách sinh viên");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=mau_danh_sach_sinh_vien.xlsx");
    res.send(buffer);
  });

  app.post("/api/events/:eventId/attendees/bulk", isAuthenticated, checkEventAccess, upload.single("file"), async (req: any, res) => {
    if (!canManageAttendees(req.eventAccess)) {
      return res.status(403).json({ message: "Bạn không có quyền import sinh viên" });
    }

    const eventId = parseInt(req.params.eventId, 10);
    const file = req.file;
    const userId = req.user?.claims?.sub;

    if (!file) {
      return res.status(400).json({ message: "Vui lòng chọn file" });
    }

    const allowedMimes = new Set([
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]);

    const normalizedName = file.originalname.toLowerCase();
    const hasAllowedExt = normalizedName.endsWith(".csv") || normalizedName.endsWith(".xlsx") || normalizedName.endsWith(".xls");
    if (!hasAllowedExt || (!allowedMimes.has(file.mimetype) && file.mimetype !== "application/octet-stream")) {
      return res.status(400).json({ message: "Định dạng file không hợp lệ. Vui lòng sử dụng CSV hoặc Excel" });
    }

    try {
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Sự kiện không tồn tại" });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Không có quyền thao tác" });
      }

      let attendeesData: any[] = [];

      if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        const csvData: any[] = [];
        const stream = Readable.from(file.buffer.toString());

        await new Promise((resolve, reject) => {
          stream
            .pipe(csvParser())
            .on("data", (data) => csvData.push(data))
            .on("end", () => resolve(csvData))
            .on("error", reject);
        });

        attendeesData = csvData.map((row) => ({
          name: row["Tên"] || row.name || "",
          studentId: row["MSSV/MSNV"] || row.studentId || "",
          email: row.Email || row.email || "",
          faculty: row.Khoa || row.faculty || "",
          major: row["Ngành"] || row.major || "",
        }));
      } else if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.mimetype === "application/vnd.ms-excel" ||
        file.originalname.endsWith(".xlsx") ||
        file.originalname.endsWith(".xls")
      ) {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        attendeesData = data.map((row: any) => ({
          name: row["Tên"] || row.name || "",
          studentId: row["MSSV/MSNV"] || row.studentId || "",
          email: row.Email || row.email || "",
          faculty: row.Khoa || row.faculty || "",
          major: row["Ngành"] || row.major || "",
        }));
      } else {
        return res.status(400).json({ message: "Định dạng file không hợp lệ. Vui lòng sử dụng CSV hoặc Excel" });
      }

      const validAttendees = attendeesData.filter((a) => a.name && a.studentId);
      if (validAttendees.length === 0) {
        return res.status(400).json({ message: "Không tìm thấy dữ liệu hợp lệ trong file" });
      }

      const createdAttendees: any[] = [];
      const errors: string[] = [];

      for (const attendeeData of validAttendees) {
        try {
          const qrCode = await ensureUniqueQRCode();
          const qrDataUrl = await QRCode.toDataURL(qrCode);

          const attendee = await storage.createAttendee({
            ...attendeeData,
            eventId,
            qrCode,
            qrPath: qrDataUrl,
          });
          createdAttendees.push(attendee);
        } catch (error: any) {
          errors.push(`${attendeeData.name} (${attendeeData.studentId}): ${error.message}`);
        }
      }

      cacheManager.invalidatePattern("stats:");

      res.json({
        message: `Đã thêm ${createdAttendees.length} sinh viên thành công`,
        created: createdAttendees.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ message: "Lỗi khi nhập danh sách sinh viên" });
    }
  });
}
