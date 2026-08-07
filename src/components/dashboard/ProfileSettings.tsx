import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { SettingsDialog } from "../settings/SettingsDialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, LockKeyhole, Upload, Settings, User2, Loader2 } from "lucide-react";
import { proxyImageUrl } from "@/lib/image-proxy";
import { ActivityLogger } from "@/hooks/useActivityLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient, dataTagErrorSymbol } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ClearDataDialog } from "./ClearDataDialog";
import { TeacherPaymentSettings } from "./TeacherPaymentSettings";
import { PlatformSettingsInfo } from "./PlatformSettingsInfo";
import { User } from "@supabase/supabase-js";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  school_name: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  userId: string;
}

export function ProfileSettings({ userId }: ProfileSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || "",
        school_name: profile.school_name || "",
      });
    }
  }, [profile, reset]);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      if (profile?.avatar_url) {
        const currentPath = profile.avatar_url.split("/avatars/")[1];
        if (currentPath) {
          await (supabase as any)
            .from("deleted_avatars")
            .insert({
              user_id: userId,
              avatar_url: profile.avatar_url,
              storage_path: currentPath,
              is_active: false,
              crop_data: { x: 0, y: 0, width: 100, height: 100 },
            });
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl } as any)
        .eq("id", userId);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["deleted-avatars", userId] });
      ActivityLogger.uploadAvatar();
      toast({
        title: "Profile picture updated",
        description: "Your avatar has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Avatar upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      localStorage.setItem("cred", JSON.stringify({ "name": data.full_name || data.email }))
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
          school_name: data.school_name || null,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      ActivityLogger.updateProfile(["full_name", "phone", "school_name"]);
    },
    onError: (error: any) => {
      localStorage.setItem("cred", JSON.stringify({ "name": profile?.full_name || profile?.email }))
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  const handlePasswordChange = () => {
    navigate("/reset-password/#profile");
  };

  const handleClearAllData = async () => {
    try {
      const { error: notesErr } = await supabase
        .from("notes")
        .delete()
        .eq("teacher_id", userId);
      if (notesErr) throw notesErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ phone: null, school_name: null } as any)
        .eq("id", userId);
      if (profileErr) throw profileErr;

      toast({
        title: "Operation Successfull",
        description: "All your data has been cleared.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PlatformSettingsInfo userId={userId} />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <User2 className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Update your personal information and profile picture.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-4 sm:px-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            {proxyImageUrl(profile?.avatar_url ?? null) ? (
              <img
                src={proxyImageUrl(profile?.avatar_url ?? null)}
                alt="Avatar"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold">
                {(profile?.full_name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 border rounded-md cursor-pointer select-none"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin inline-block" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                Upload Avatar{" "}
                <input
                  type="file"
                  accept="image/*"
                  id="avatar-upload"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                  }}
                />
              </span>
            </label>
            <Button
              variant="default"
              className="w-full sm:w-auto items-center"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="Enter your name"
                />
                {errors.full_name && (
                  <p className="text-xs text-destructive">
                    {errors.full_name.message}
                  </p>
                )}
                {!errors.full_name && (
                  <p className="text-xs text-muted-foreground">
                    Enter your full name.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  disabled
                  {...register("email")}
                  placeholder="Enter your email"
                />
                <p className="text-xs text-muted-foreground">
                  You can not edit your email.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Enter your phone number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter phone number that will be used to contact you.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school_name">School/Institution Name</Label>
                <Input
                  id="school_name"
                  {...register("school_name")}
                  placeholder="Enter your school or institution name"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your school or institution name. You can't change it in
                  upload tab.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!isDirty || updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline-block" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>

              <Button
                type="button"
                className="gap-2"
                variant="destructive"
                onClick={handlePasswordChange}
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                Reset Password
              </Button>

              <ClearDataDialog handleClearAllData={handleClearAllData} />
            </div>
          </form>

        </CardContent>
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={user}
        />
      </Card>

      <TeacherPaymentSettings teacherId={userId} />
    </>
  );
}
