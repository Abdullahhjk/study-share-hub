import { supabase } from "@/integrations/supabase/client";

type ActivityCategory = "auth" | "notes" | "requests" | "profile" | "admin" | "navigation" | "general";

interface LogActivityParams {
  action: string;
  category: ActivityCategory;
  details?: Record<string, any>;
}

async function getIpAddress(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

let cachedIp: string | null = null;

export async function logActivity({ action, category, details = {} }: LogActivityParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!cachedIp) {
      cachedIp = await getIpAddress();
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      category,
      details,
      ip_address: cachedIp,
      user_agent: navigator.userAgent,
    } as any);
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}

// Convenience methods — covers every trackable action
export const ActivityLogger = {
  // Auth
  login: () => logActivity({ action: "login", category: "auth" }),
  logout: () => logActivity({ action: "logout", category: "auth" }),
  signup: () => logActivity({ action: "signup", category: "auth" }),
  passwordReset: () => logActivity({ action: "password_reset", category: "auth" }),

  // Notes
  uploadNote: (title: string) => logActivity({ action: "upload_note", category: "notes", details: { title } }),
  editNote: (title: string) => logActivity({ action: "edit_note", category: "notes", details: { title } }),
  deleteNote: (title: string) => logActivity({ action: "delete_note", category: "notes", details: { title } }),
  downloadNote: (title: string) => logActivity({ action: "download_note", category: "notes", details: { title } }),

  // Requests
  createRequest: (requestId: string, amount: number) => logActivity({ action: "create_request", category: "requests", details: { requestId, amount } }),
  updateRequest: (requestId: string, status: string) => logActivity({ action: "update_request", category: "requests", details: { requestId, status } }),
  verifyRequest: (requestId: string) => logActivity({ action: "verify_request", category: "requests", details: { requestId } }),
  rejectRequest: (requestId: string, reason: string) => logActivity({ action: "reject_request", category: "requests", details: { requestId, reason } }),
  completeRequest: (requestId: string) => logActivity({ action: "complete_request", category: "requests", details: { requestId } }),

  // Profile
  updateProfile: (fields: string[]) => logActivity({ action: "profile_update", category: "profile", details: { fields } }),
  uploadAvatar: () => logActivity({ action: "avatar_upload", category: "profile" }),

  // Admin
  roleChange: (targetUser: string, newRole: string) => logActivity({ action: "role_change", category: "admin", details: { targetUser, newRole } }),
  deleteUser: (targetUser: string) => logActivity({ action: "delete_user", category: "admin", details: { targetUser } }),
  impersonateUser: (targetUser: string) => logActivity({ action: "impersonate_user", category: "admin", details: { targetUser } }),
  sendNotification: (target: string) => logActivity({ action: "send_notification", category: "admin", details: { target } }),
  editNotification: (notifId: string) => logActivity({ action: "edit_notification", category: "admin", details: { notifId } }),
  deleteNotification: (notifId: string) => logActivity({ action: "delete_notification", category: "admin", details: { notifId } }),
  approveTeacher: (userId: string) => logActivity({ action: "approve_teacher", category: "admin", details: { userId } }),
  rejectTeacher: (userId: string) => logActivity({ action: "reject_teacher", category: "admin", details: { userId } }),

  // Categories
  createCategory: (name: string) => logActivity({ action: "create_category", category: "notes", details: { name } }),
  deleteCategory: (name: string) => logActivity({ action: "delete_category", category: "notes", details: { name } }),
  createSubcategory: (name: string) => logActivity({ action: "create_subcategory", category: "notes", details: { name } }),
  deleteSubcategory: (name: string) => logActivity({ action: "delete_subcategory", category: "notes", details: { name } }),

  // Navigation
  pageView: (page: string) => logActivity({ action: "page_view", category: "navigation", details: { page } }),
};
