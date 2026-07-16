import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// --- Types matching the Express + MySQL backend ---
export type Clinic = {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  district: string | null;
  phone: string | null;
  status: "open" | "closed";
  specialist_on_duty: string | null;
  medication_stock: "full" | "limited" | "out_of_stock";
  distance_km?: number;
};

export type PatientProfile = {
  id: number; phone: string; full_name: string; role: string;
  date_of_birth: string | null; sex: string | null; district: string | null;
  created_at: string;
};

export type Visit = {
  id: number; visit_date: string; diagnosis_summary: string | null;
  notes: string | null; prescription: string | null; clinic_name: string;
};
export type Referral = {
  id: number; reason: string; status: string; created_at: string;
  from_clinic: string; to_clinic: string;
};
export type SymptomReport = {
  id: number; channel: "app" | "ussd"; urgency_level: "routine" | "soon" | "emergency";
  advice_given: string; created_at: string;
};

export type Appointment = {
  id: number; user_id: number; clinic_id: number; clinic_name?: string;
  appointment_date: string; reason: string | null;
  status: "scheduled" | "completed" | "cancelled" | "missed";
  created_at: string;
};

export type Notification = {
  id: number; title: string; body: string | null;
  kind: "sos" | "appointment" | "system" | "record";
  read_at: string | null; created_at: string;
};

export type SosAlert = {
  id: number; user_id: number; lat: number; lng: number;
  assigned_clinic_id: number | null; status: "dispatched" | "en_route" | "arrived" | "cancelled";
  clinic_name: string | null; clinic_phone: string | null;
  created_at: string; updated_at: string;
};

// --- Hooks ---
const DEFAULT_LOC = { lat: 0.3476, lng: 32.5825 }; // Kampala fallback

export function useGeolocation() {
  // Not a query — returns a promise on demand.
  return () =>
    new Promise<{ lat: number; lng: number }>((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) return resolve(DEFAULT_LOC);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(DEFAULT_LOC),
        { timeout: 5000 },
      );
    });
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ["profile"], enabled,
    queryFn: () => api<{ user: PatientProfile }>("/patients/me").then((r) => r.user),
  });
}

export function useHistory(enabled = true) {
  return useQuery({
    queryKey: ["history"], enabled,
    queryFn: () => api<{ visits: Visit[]; referrals: Referral[]; symptom_reports: SymptomReport[] }>(
      "/patients/me/history",
    ),
  });
}

export function useNearbyClinics(coords: { lat: number; lng: number } | null, openOnly = false) {
  return useQuery({
    queryKey: ["clinics", coords?.lat, coords?.lng, openOnly],
    enabled: !!coords,
    queryFn: () => api<{ clinics: Clinic[] }>(
      `/clinics/nearby?lat=${coords!.lat}&lng=${coords!.lng}&openOnly=${openOnly}`,
      { auth: false },
    ).then((r) => r.clinics),
  });
}

export function useAppointments(enabled = true) {
  return useQuery({
    queryKey: ["appointments"], enabled,
    queryFn: () => api<{ appointments: Appointment[] }>("/appointments/me").then((r) => r.appointments),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { clinic_id: number; appointment_date: string; reason?: string }) =>
      api<{ appointment: Appointment }>("/appointments", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Appointment["status"] }) =>
      api<{ appointment: Appointment }>(`/appointments/${id}/status`, {
        method: "PATCH", body: { status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"], enabled,
    queryFn: () => api<{ notifications: Notification[] }>("/notifications/me").then((r) => r.notifications),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSubmitSymptoms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      chestPain?: boolean; breathingDifficulty?: boolean; heavyBleeding?: boolean;
      lossOfConsciousness?: boolean; fever?: boolean;
      durationDays: number; painLocation?: string;
    }) => api<{ urgency_level: string; advice: string; report_id: number }>(
      "/symptoms", { method: "POST", body: input },
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });
}

export function useTriggerSos() {
  return useMutation({
    mutationFn: (input: { lat: number; lng: number }) =>
      api<{
        alert_id: number; status: string;
        assigned_clinic: { id: number; name: string; distance_km: number; phone: string | null };
      }>("/sos", { method: "POST", body: input }),
  });
}

export function useSosAlert(id: number | null) {
  return useQuery({
    queryKey: ["sos", id], enabled: id != null,
    queryFn: () => api<{ alert: SosAlert }>(`/sos/${id}`).then((r) => r.alert),
    refetchInterval: 5000,
  });
}
