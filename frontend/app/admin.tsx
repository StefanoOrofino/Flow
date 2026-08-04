import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { S, R, F, MAX_W, Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeProvider";
import { Body, Btn } from "@/src/components";
import { Icon } from "@/src/ui/Icon";
import { Tabs as DSTabs, Table, Chip, Modal, useToast } from "@/src/ui/DS";

function fmtDate(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return "—"; }
}
function fmtDateTime(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}
const roleLabel = (t: any, r: string) => t(`admin:role${(r || "user").charAt(0).toUpperCase() + (r || "user").slice(1)}`);

export default function AdminConsole() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { C } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const styles = useMemo(() => createStyles(C), [C]);

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [tab, setTab] = useState("Overview");

  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [roleTarget, setRoleTarget] = useState<any>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try { setStatus(await api.adminStatus()); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const loadData = useCallback(async () => {
    try {
      const [sm, us, pr, au] = await Promise.all([
        api.adminSummary(), api.adminUsers(), api.adminProjects(), api.adminAudit(),
      ]);
      setSummary(sm); setUsers(us.users || []); setProjects(pr.projects || []); setAudit(au.audit || []);
    } catch (e: any) { toast.show(t("admin:loadError"), "error"); }
  }, [toast, t]);
  useEffect(() => { if (status?.is_privileged) loadData(); }, [status?.is_privileged, loadData]);

  const claim = async () => {
    setClaiming(true);
    try { await api.adminClaimOwner(); toast.show(t("admin:claimSuccess"), "success"); await loadStatus(); }
    catch (e: any) { toast.show(t("admin:claimError"), "error"); }
    finally { setClaiming(false); }
  };

  const setRole = async (uid: string, role: string) => {
    setRoleTarget(null);
    try {
      await api.adminSetRole(uid, role);
      toast.show(t("admin:roleUpdated", { role: roleLabel(t, role) }), "success");
      setUsers((list) => list.map((u) => (u.user_id === uid ? { ...u, role } : u)));
    } catch (e: any) { toast.show(e?.message || t("admin:roleError"), "error"); }
  };

  // ---- gate states -------------------------------------------------------
  if (loading) return <View style={styles.center}><ActivityIndicator color={C.brand} size="large" /></View>;

  if (!status?.is_privileged) {
    return (
      <View style={{ flex: 1, backgroundColor: C.surface }}>
        <Header C={C} styles={styles} insets={insets} onBack={() => router.back()} role={undefined} />
        <View style={styles.gate}>
          <View style={styles.gateIcon}><Icon name="shield" size={30} color={C.brand} strokeWidth={1.75} /></View>
          {status?.can_claim ? (
            <>
              <Text style={styles.gateTitle}>{t("admin:claimTitle")}</Text>
              <Body muted style={styles.gateBody}>{t("admin:claimBody", { email: user?.email })}</Body>
              <Btn title={t("admin:claimBtn")} icon="shield-checkmark" loading={claiming} onPress={claim} testID="claim-owner" />
            </>
          ) : (
            <>
              <Text style={styles.gateTitle}>{t("admin:noAccessTitle")}</Text>
              <Body muted style={styles.gateBody}>{t("admin:noAccessBody")}</Body>
              <Btn title={t("admin:backToApp")} variant="ghost" onPress={() => router.back()} />
            </>
          )}
        </View>
      </View>
    );
  }

  const roleBreakdown = summary?.users?.by_role || {};

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Header C={C} styles={styles} insets={insets} onBack={() => router.back()} role={status.my_role} />
      <View style={styles.tabsWrap}>
        <View style={styles.tabsInner}>
          <DSTabs value={tab} onChange={setTab} tabs={[
            { key: "Overview", label: t("admin:tabOverview"), icon: "dashboard" },
            { key: "Users", label: t("admin:tabUsers"), icon: "users" },
            { key: "Projects", label: t("admin:tabProjects"), icon: "film" },
            { key: "Audit", label: t("admin:tabAudit"), icon: "history" },
          ]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "Overview" && (
          <View>
            {!summary ? <ActivityIndicator color={C.brand} style={{ marginTop: S.xxl }} /> : (
              <>
                <View style={styles.statGrid}>
                  <Stat C={C} styles={styles} icon="users" label={t("admin:statTotalUsers")} value={summary.users.total} />
                  <Stat C={C} styles={styles} icon="film" label={t("admin:statProjects")} value={summary.projects.total} />
                  <Stat C={C} styles={styles} icon="sparkles" label={t("admin:statGenerated")} value={summary.projects.generated} />
                  <Stat C={C} styles={styles} icon="image" label={t("admin:statScenes")} value={summary.content.scenes} />
                  <Stat C={C} styles={styles} icon="wand" label={t("admin:statAiGenerations")} value={summary.usage.ai_generations} />
                  <Stat C={C} styles={styles} icon="download" label={t("admin:statExports")} value={summary.usage.exports} />
                </View>

                <SecHead C={C} styles={styles} icon="users" label={t("admin:rolesTitle")} />
                <View style={styles.roleRow}>
                  {["owner", "admin", "support", "user"].map((r) => (
                    <View key={r} style={styles.roleCell}>
                      <Text style={styles.roleCount}>{roleBreakdown[r] ?? 0}</Text>
                      <Text style={styles.roleLbl}>{roleLabel(t, r)}</Text>
                    </View>
                  ))}
                </View>

                <SecHead C={C} styles={styles} icon="shield" label={t("admin:healthTitle")} />
                <View style={styles.healthWrap}>
                  <HealthRow C={C} styles={styles} label={t("admin:healthApi")} value={summary.health.api} ok />
                  <HealthRow C={C} styles={styles} label={t("admin:healthDatabase")} value={summary.health.database} ok />
                  <HealthRow C={C} styles={styles} label={t("admin:healthAiProvider")} value={summary.health.ai_provider} ok />
                  <HealthRow C={C} styles={styles} label={t("admin:healthImageProvider")} value={summary.health.image_provider} ok />
                </View>

                <SecHead C={C} styles={styles} icon="user" label={t("admin:recentTitle")} />
                {(summary.recent_users || []).map((u: any) => (
                  <View key={u.user_id} style={styles.recentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentEmail} numberOfLines={1}>{u.email}</Text>
                      <Text style={styles.recentMeta}>{fmtDate(u.created_at)}</Text>
                    </View>
                    <Chip label={roleLabel(t, u.role)} active={u.role === "owner"} />
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {tab === "Users" && (
          <Table
            columns={[
              { key: "email", label: t("admin:colUser"), flex: 2.2 },
              { key: "role", label: t("admin:colRole"), flex: 1, align: "left" },
              { key: "projects", label: t("admin:colProjects"), flex: 0.8, align: "right" },
            ]}
            rows={users}
            onRowPress={(row) => setRoleTarget(row)}
            renderCell={(row, col) => {
              if (col.key === "email") return (
                <View><Text style={styles.cellStrong} numberOfLines={1}>{row.email}</Text>
                  <Text style={styles.cellSub}>{t("admin:planSuffix", { plan: row.plan })}</Text></View>
              );
              if (col.key === "role") return <Chip label={roleLabel(t, row.role)} active={row.role === "owner"} />;
              return <Text style={styles.cellNum}>{row.projects}</Text>;
            }}
          />
        )}

        {tab === "Projects" && (
          <Table
            columns={[
              { key: "title", label: t("admin:colProject"), flex: 2 },
              { key: "owner_email", label: t("admin:colOwner"), flex: 1.6 },
              { key: "scenes", label: t("admin:colScenes"), flex: 0.7, align: "right" },
            ]}
            rows={projects}
            renderCell={(row, col) => {
              if (col.key === "title") return (
                <View><Text style={styles.cellStrong} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.cellSub}>{row.status}{row.archived ? ` · ${t("admin:archivedSuffix")}` : ""}</Text></View>
              );
              if (col.key === "owner_email") return <Text style={styles.cellSub} numberOfLines={1}>{row.owner_email}</Text>;
              return <Text style={styles.cellNum}>{row.scenes}</Text>;
            }}
          />
        )}

        {tab === "Audit" && (
          <View>
            {audit.length === 0 ? <Body muted style={{ marginTop: S.lg }}>{t("admin:auditEmpty")}</Body> : audit.map((a, i) => (
              <View key={i} style={styles.auditRow}>
                <View style={styles.auditDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditAction}>{(a.action || "").replace(/_/g, " ")}</Text>
                  <Text style={styles.auditMeta}>
                    {a.actor_email || a.actor_user_id}
                    {a.after?.role ? ` → ${a.after.role}` : ""} · {fmtDateTime(a.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Role change modal */}
      <Modal visible={!!roleTarget} onClose={() => setRoleTarget(null)} title={t("admin:roleModalTitle")}
        footer={<Btn title={t("common:cancel")} variant="ghost" onPress={() => setRoleTarget(null)} />}>
        {roleTarget ? (
          <View>
            <Body muted style={{ marginBottom: S.md }}>{roleTarget.email}</Body>
            {["user", "support", "admin", "owner"].map((r) => {
              const disabled = roleTarget.role === "owner"; // owner is protected
              const isOwnerGrant = r === "owner" && status.my_role !== "owner";
              return (
                <Pressable key={r} disabled={disabled || isOwnerGrant}
                  onPress={() => setRole(roleTarget.user_id, r)} testID={`role-${r}`}
                  style={[styles.roleOpt, roleTarget.role === r && styles.roleOptActive, (disabled || isOwnerGrant) && { opacity: 0.4 }]}>
                  <Text style={[styles.roleOptTxt, roleTarget.role === r && { color: C.brand }]}>{roleLabel(t, r)}</Text>
                  {roleTarget.role === r ? <Icon name="check" size={16} color={C.brand} /> : null}
                </Pressable>
              );
            })}
            {roleTarget.role === "owner" ? <Body muted style={{ marginTop: S.sm, fontSize: 12 }}>{t("admin:roleProtected")}</Body> : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Header({ C, styles, insets, onBack, role }: any) {
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
      <View style={styles.hTopRow}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.hIconBtn} testID="admin-back"><Icon name="arrow-left" size={19} color={C.onSurface} /></Pressable>
        <Text style={styles.hKicker}>PLATFORM</Text>
        <View style={{ flex: 1 }} />
        {role ? <Chip label={role} active={role === "owner"} icon="shield" /> : null}
      </View>
      <Text style={styles.hTitle}>Admin Console</Text>
    </View>
  );
}
function Stat({ C, styles, icon, label, value }: any) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}><Icon name={icon} size={16} color={C.brand} strokeWidth={1.9} /></View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}
function SecHead({ C, styles, icon, label }: any) {
  return <View style={styles.secHead}><Icon name={icon} size={14} color={C.brand} strokeWidth={2} /><Text style={styles.secLabel}>{label}</Text></View>;
}
function HealthRow({ C, styles, label, value, ok }: any) {
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthLbl}>{label}</Text>
      <View style={styles.healthVal}><View style={[styles.healthDot, { backgroundColor: ok ? C.success : C.warning }]} /><Text style={styles.healthTxt}>{value}</Text></View>
    </View>
  );
}

const createStyles = (C: Palette) => StyleSheet.create({
  center: { flex: 1, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: S.xl, paddingBottom: S.lg, backgroundColor: C.surface },
  hTopRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: S.lg },
  hKicker: { color: C.onSurface3, fontFamily: F.text, fontSize: 10.5, letterSpacing: 2.5, fontWeight: "600", marginLeft: 2 },
  hIconBtn: { width: 38, height: 38, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  hTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5, fontWeight: "500" },
  tabsWrap: { backgroundColor: C.surface },
  tabsInner: { maxWidth: MAX_W, width: "100%", alignSelf: "center", paddingHorizontal: S.xl },
  scroll: { padding: S.xl, paddingTop: S.xxl, paddingBottom: 120, maxWidth: MAX_W, alignSelf: "center", width: "100%" },

  gate: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xl },
  gateIcon: { width: 76, height: 76, borderRadius: 22, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.xl },
  gateTitle: { color: C.onSurface, fontFamily: F.display, fontSize: 27, letterSpacing: -0.3, textAlign: "center", marginBottom: S.sm },
  gateBody: { textAlign: "center", maxWidth: 380, lineHeight: 22, marginBottom: S.xl },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.md, marginBottom: S.xl },
  stat: { flexGrow: 1, flexBasis: "30%", minWidth: 140, backgroundColor: C.surface2, borderRadius: R.lg, padding: S.lg },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandTint, alignItems: "center", justifyContent: "center", marginBottom: S.md },
  statVal: { color: C.onSurface, fontFamily: F.display, fontSize: 28, letterSpacing: -0.3 },
  statLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 2 },

  secHead: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: S.lg, marginTop: S.md },
  secLabel: { color: C.brand, fontFamily: F.text, fontSize: 11.5, letterSpacing: 1.6, fontWeight: "600" },

  roleRow: { flexDirection: "row", backgroundColor: C.surface2, borderRadius: R.lg, paddingVertical: S.lg, marginBottom: S.md },
  roleCell: { flex: 1, alignItems: "center" },
  roleCount: { color: C.onSurface, fontFamily: F.display, fontSize: 24 },
  roleLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 11, marginTop: 2, textTransform: "capitalize" },

  healthWrap: { backgroundColor: C.surface2, borderRadius: R.lg, paddingHorizontal: S.lg, marginBottom: S.md },
  healthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  healthLbl: { color: C.onSurface2, fontFamily: F.text, fontSize: 13.5 },
  healthVal: { flexDirection: "row", alignItems: "center", gap: 6 },
  healthDot: { width: 7, height: 7, borderRadius: 4 },
  healthTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 13, textTransform: "capitalize" },

  recentRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  recentEmail: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500" },
  recentMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 11.5, marginTop: 2 },

  cellStrong: { color: C.onSurface, fontFamily: F.text, fontSize: 13.5, fontWeight: "500" },
  cellSub: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  cellNum: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "600" },

  auditRow: { flexDirection: "row", gap: S.md, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  auditDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand, marginTop: 6 },
  auditAction: { color: C.onSurface, fontFamily: F.text, fontSize: 14, fontWeight: "500", textTransform: "capitalize" },
  auditMeta: { color: C.onSurface2, fontFamily: F.text, fontSize: 12, marginTop: 2 },

  roleOpt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: S.md, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.border, marginBottom: S.sm },
  roleOptActive: { borderColor: C.brand, backgroundColor: C.brandTint },
  roleOptTxt: { color: C.onSurface, fontFamily: F.text, fontSize: 15, textTransform: "capitalize" },
});
