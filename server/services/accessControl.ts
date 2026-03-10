type EventAccess = {
  role?: string;
  permissions?: string[];
};

export function isEventOwner(access?: EventAccess): boolean {
  return access?.role === "owner";
}

export function hasEventPermission(access: EventAccess | undefined, permission: string): boolean {
  if (isEventOwner(access)) {
    return true;
  }

  return Array.isArray(access?.permissions) && access!.permissions!.includes(permission);
}

export function canManageAttendees(access?: EventAccess): boolean {
  return hasEventPermission(access, "manage_attendees");
}

export function canEditEvent(access?: EventAccess): boolean {
  return hasEventPermission(access, "edit_event");
}

export function canCheckin(access?: EventAccess): boolean {
  return hasEventPermission(access, "checkin");
}
