export interface Category {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  category?: Category;
  created_by: string;
}

export interface Teacher {
  avatar_url: string;
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  school_name: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  preview_image_url: string | null;
  is_free: boolean;
  price: number;
  teacher_id: string;
  subcategory_id: string;
  school_name: string | null;
  deleted_at: string | null;
  purged_at: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
  subcategory?: Subcategory & { category?: Category };
}

export interface NoteRequest {
  id: string;
  request_id: string;
  student_contact: string;
  contact_type: "email" | "phone";
  receipt_image_url: string;
  total_amount: number;
  status: "pending" | "verified" | "completed" | "rejected" | "cancelled";
  teacher_id: string;
  created_at: string;
  updated_at: string;
  rejection_reason: string | null;
  refund_screenshot_url: string | null;
  notes?: Note[];
}

export interface RequestNote {
  id: string;
  request_id: string;
  note_id: string;
}