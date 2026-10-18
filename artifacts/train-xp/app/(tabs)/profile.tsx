import { toggleFocus } from "@/lib/input";
import {
  formatWeight,
  weightUnitLabel,
  cmToDisplayHeight,
  heightUnitLabel,
} from "@/lib/units";
import { useTodayKey } from "@/hooks/useTodayKey";
import { Text } from "@/components/AppTypography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Polygon, Rect } from "react-native-svg";
import {
  DualMannequinFocusPicker,
  type FocusArea,
} from "@/components/DualMannequinFocusPicker";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PaywallModal } from "@/components/PaywallModal";
import { ProgressBar } from "@/components/ProgressBar";
import { useAppState } from "@/context/AppState";
import { useColors } from "@/hooks/useColors";
import { MUSCLE_NAMES, type MuscleSlug } from "@/lib/muscles";
import { useI18n } from "@/lib/i18n";
import { isAppleAuthAvailable } from "@/lib/auth";
import { TERMS_OF_USE_URL, PRIVACY_POLICY_URL } from "@/lib/purchases";

import { type WorkoutHistoryItem } from "@/lib/effort";
import { TrophyShowcase } from "@/components/TrophyShowcase";
import { LoginModal } from "@/components/LoginModal";
import { TrainingMetricsModal } from "@/components/TrainingMetricsModal";
import { FeedbackModal } from "@/components/FeedbackModal";

// Theme tokens for Cyberpunk Dark RPG
const THEME = {
  bg: "#080C14",
  card: "#111724",
  cardBorder: "#1A2333",
  cardSubtle: "#141D2E",
  accentGreen: "#22C55E",
  accentBlue: "#38BDF8",
  accentOrange: "#F97316",
  accentPurple: "#C084FC",
  accentDiamond: "#818CF8",
  textMain: "#FFFFFF",
  textMuted: "#94A3B8",
  textSubtle: "#64748B",
};

const STORE_URL =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_APP_STORE_URL
    : process.env.EXPO_PUBLIC_PLAY_STORE_URL;

// 6-Axis Muscle Balance Radar Component
function MuscleBalanceRadar({
  muscleCounts = {},
}: {
  muscleCounts?: Partial<Record<MuscleSlug, number>>;
}) {
  const { t } = useI18n();
  const categories = [
    { label: t.profile.chest, count: muscleCounts.chest || 0 },
    {
      label: t.profile.back,
      count:
        (muscleCounts["upper-back"] || 0) + (muscleCounts["trapezius"] || 0),
    },
    {
      label: t.profile.arms,
      count: (muscleCounts.biceps || 0) + (muscleCounts.triceps || 0),
    },
    {
      label: t.profile.legs,
      count:
        (muscleCounts.quadriceps || 0) +
        (muscleCounts.hamstring || 0) +
        (muscleCounts.gluteal || 0),
    },
    { label: t.profile.shoulders, count: muscleCounts.deltoids || 0 },
    {
      label: t.profile.core,
      count: (muscleCounts.abs || 0) + (muscleCounts.obliques || 0),
    },
  ];

  const hasAnyData = categories.some((c) => c.count > 0);
  const maxVal = Math.max(...categories.map((c) => c.count), 1);
  const cx = 110;
  const cy = 90;
  const r = 60;

  // Calculate polygon points
  const points = categories
    .map((cat, idx) => {
      const angle = (idx * 60 - 90) * (Math.PI / 180);
      const dist = hasAnyData && cat.count > 0 ? (cat.count / maxVal) * r : 4;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={styles.radarCard}>
      <Text style={styles.radarHeader}>
        {t.profile.muscleBalance}
      </Text>
      <View style={styles.radarSvgWrap}>
        <Svg width="220" height="180" viewBox="0 0 220 180">
          {/* Concentric Web Rings */}
          <Polygon
            points="110,30 162,60 162,120 110,150 58,120 58,60"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Polygon
            points="110,50 145,70 145,110 110,130 75,110 75,70"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Polygon
            points="110,70 128,80 128,100 110,110 92,100 92,80"
            fill="none"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Spokes */}
          <Line
            x1="110"
            y1="90"
            x2="110"
            y2="30"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Line
            x1="110"
            y1="90"
            x2="162"
            y2="60"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Line
            x1="110"
            y1="90"
            x2="162"
            y2="120"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Line
            x1="110"
            y1="90"
            x2="110"
            y2="150"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Line
            x1="110"
            y1="90"
            x2="58"
            y2="120"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <Line
            x1="110"
            y1="90"
            x2="58"
            y2="60"
            stroke="#1E293B"
            strokeWidth="1"
          />

          {/* Active Player Shape */}
          <Polygon
            points={points}
            fill="rgba(56, 189, 248, 0.35)"
            stroke="#38BDF8"
            strokeWidth={2}
          />
        </Svg>
      </View>
      <View style={styles.radarLabelsRow}>
        {categories.map((c) => (
          <View key={c.label} style={styles.radarBadge}>
            <Text style={styles.radarBadgeText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    stats,
    profile,
    workoutsHistory,
    updateProfile,
    loginApple,
    loginGoogle,
    logoutAuth,
    deleteAccountData,
    resetOnboarding,
    syncStatus,
    retrySync,
  } = useAppState();
  const { locale, setLocale, t } = useI18n();
  const todayKey = useTodayKey();
  const authLock = useRef(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showChallenges, setShowChallenges] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [autoRestTimer, setAutoRestTimer] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    void isAppleAuthAvailable()
      .then((available) => {
        if (mounted) setAppleAvailable(available);
      })
      .catch(() => undefined);

    void AsyncStorage.multiGet([
      "@train-xp/pref:auto-rest",
      "@train-xp/pref:sound",
    ])
      .then((values) => {
        if (!mounted) return;
        if (values[0][1] !== null) setAutoRestTimer(values[0][1] === "true");
        if (values[1][1] !== null) setSoundEnabled(values[1][1] === "true");
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const targetGroups: Record<string, string[]> = {
    "Full chest": ["chest"],
    "Wide back": ["upper-back", "lower-back", "trapezius"],
    "Big arms": ["biceps", "triceps", "forearm"],
    "Visible abs": ["abs", "obliques"],
    "Broad shoulders": ["deltoids"],
    "Strong legs": ["quadriceps", "hamstring", "calves"],
    "Full glutes": ["gluteal"],
  };
  const recoveryPercent = useMemo(() => {
    const targets = profile.targetMuscles.includes("Full body")
      ? Object.keys(targetGroups)
      : profile.targetMuscles;
    const trained = targets.filter((target) =>
      (targetGroups[target] ?? []).some(
        (muscle) => (stats.muscleTrainedCount[muscle as MuscleSlug] ?? 0) > 0,
      ),
    );
    return targets.length
      ? Math.round((trained.length * 100) / targets.length)
      : 0;
  }, [profile.targetMuscles, stats.muscleTrainedCount]);
  const handleToggleMuscle = (area: FocusArea) =>
    updateProfile({
      targetMuscles: toggleFocus(profile.targetMuscles ?? [], area),
    });
  const runAuth = async (action: () => Promise<unknown>) => {
    if (authLock.current) return;
    authLock.current = true;
    setAuthBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(
        t.common.actionFailed,
        error instanceof Error ? error.message : t.common.pleaseRetry,
      );
    } finally {
      authLock.current = false;
      setAuthBusy(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await loginApple();
      if (success) {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        Alert.alert(
          t.common.success,
          t.profile.appleConnected,
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Sign In",
        err?.message || "Could not complete Apple Sign In",
      );
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await loginGoogle();
      if (!success) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t.common.success,
        t.profile.googleConnected,
      );
    } catch (err: any) {
      Alert.alert(
        "Sign In",
        err?.message || "Could not complete Google Sign In",
      );
    }
  };

  const toggleAutoRest = (val: boolean) => {
    setAutoRestTimer(val);
    void AsyncStorage.setItem("@train-xp/pref:auto-rest", String(val));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleSound = (val: boolean) => {
    setSoundEnabled(val);
    void AsyncStorage.setItem("@train-xp/pref:sound", String(val));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRateApp = () => {
    if (!STORE_URL) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t.profile.rateAppTitle,
      t.profile.rateAppMsg,
      [
        { text: t.profile.maybeLater, style: "cancel" },
        {
          text: t.profile.rate5Stars,
          onPress: () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            void Linking.openURL(STORE_URL).catch(() => undefined);
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t.profile.deleteAccountTitle,
      t.profile.deleteAccountMsg,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () =>
            void runAuth(async () => {
              setShowSettingsModal(false);
              await deleteAccountData();
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              router.replace("/");
            }),
        },
      ],
    );
  };

  const handleResetOnboarding = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t.profile.resetOnboardingTitle,
      t.profile.resetOnboardingMsg,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.profile.resetAction,
          style: "destructive",
          onPress: async () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            setShowSettingsModal(false);
            await resetOnboarding();
            router.replace("/onboarding");
          },
        },
      ],
    );
  };

  const weekStart = new Date(`${todayKey}T00:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const weekly = workoutsHistory.filter(
    (w) =>
      Date.parse(w.date) >= weekStart.getTime() &&
      Date.parse(w.date) < nextWeek.getTime(),
  );
  const weeklyDays = new Set(weekly.map((w) => w.date.slice(0, 10))).size;
  const weeklyVolume = weekly.reduce((sum, w) => sum + w.volume, 0);
  const remainingDays = Math.max(
    0,
    Math.ceil((nextWeek.getTime() - Date.now()) / 86400000),
  );
  const CHALLENGES = [
    {
      id: "sessions",
      label: t.profile.challengeSessions.replace("{days}", String(profile.daysPerWeek)),
      done: weeklyDays >= profile.daysPerWeek,
    },
    {
      id: "volume",
      label: t.profile.challengeVolume,
      done: weeklyVolume >= 10000,
    },
  ];

  const bmiInfo = useMemo(() => {
    if (!profile.height || !profile.weight || profile.height < 100) return null;
    const hM = profile.height / 100;
    const bmiVal = Number((profile.weight / (hM * hM)).toFixed(1));
    let cat = t.profile.bmiNormal;
    if (bmiVal < 18.5) cat = t.profile.bmiUnderweight;
    else if (bmiVal < 25) cat = t.profile.bmiNormal;
    else if (bmiVal < 30) cat = t.profile.bmiOverweight;
    else cat = t.profile.bmiObese;
    return { bmi: bmiVal, category: cat };
  }, [profile.height, profile.weight, t.profile]);

  const TOTAL_BARS = 22;
  const xpNeeded = stats.xpToNext || 500;
  const progressRatio = Math.min(1, Math.max(0, stats.xp / xpNeeded));
  const filledBars = Math.max(0, Math.round(progressRatio * TOTAL_BARS));

  const formattedVolume = useMemo(
    () =>
      `${formatWeight(stats.totalVolume, profile.unit, 0)} ${weightUnitLabel(profile.unit)}`,
    [stats.totalVolume, profile.unit],
  );

  return (
    <View style={[styles.screen, { backgroundColor: THEME.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 10,
            paddingBottom: 24,
          },
        ]}
      >
        {/* TOP BAR: STREAK & SETTINGS */}
        <View style={styles.topBar}>
          <Text style={styles.profileTitle} accessibilityRole="header">
            {t.profile.title}
          </Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>
              {stats.streak ?? 0} {t.common.days}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettingsModal(true);
            }}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel={t.profile.appSettings}
          >
            <Feather name="settings" size={18} color={THEME.textMain} />
          </Pressable>
        </View>

        {/* HERO PROFILE RPG HEADER */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCenter}>
              <Text style={styles.avatarLetter}>
                {(profile.name || "L").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {stats.level}</Text>
            </View>
          </View>

          <Text style={styles.profileName}>{profile.name || "Lifter"}</Text>
          <Text style={styles.userRole}>
            {t.onboarding.goals[profile.goal] || profile.goal}
          </Text>

          {/* BIOMETRICS RPG SPEC STRIP */}
          <View style={styles.biometricsRow}>
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>
                {t.profile.genderLabel}
              </Text>
              <Text style={styles.bioValue}>
                {profile.gender === "Female"
                  ? t.profile.genderFemale
                  : t.profile.genderMale}
              </Text>
            </View>
            <View style={styles.bioDivider} />
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>
                {t.profile.heightLabel}
              </Text>
              <Text style={styles.bioValue}>
                {cmToDisplayHeight(profile.height, profile.unit)}{" "}
                {heightUnitLabel(profile.unit)}
              </Text>
            </View>
            <View style={styles.bioDivider} />
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>
                {t.profile.weightLabel}
              </Text>
              <Text style={styles.bioValue}>
                {formatWeight(profile.weight, profile.unit)}{" "}
                {weightUnitLabel(profile.unit)}
              </Text>
            </View>
            <View style={styles.bioDivider} />
            <View style={styles.bioItem}>
              <Text style={styles.bioLabel}>BMI</Text>
              <Text style={styles.bioValue}>
                {bmiInfo ? `${bmiInfo.bmi}` : "--"}
                {bmiInfo?.category ? (
                  <Text style={{ fontSize: 12, color: THEME.accentGreen }}>
                    {" "}
                    {bmiInfo.category}
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>

          {/* COMBAT METRICS ROW */}
          <View style={styles.tripleStatsRow}>
            <View style={styles.statCol}>
              <Feather name="zap" size={16} color={THEME.accentBlue} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {stats.streak} {t.profile.streakUnit}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t.profile.streakLabel}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Feather name="anchor" size={16} color={THEME.accentOrange} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {formattedVolume}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                VOLUME
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Feather name="activity" size={16} color={THEME.accentGreen} />
              <Text style={styles.statNumber} numberOfLines={1}>
                {stats.workouts}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t.profile.missionsLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. TOP 3 TROPHIES SHOWCASE */}
        <TrophyShowcase
          benchKg={profile.benchPressPR}
          squatKg={profile.prSquat}
          deadliftKg={profile.deadliftPR}
          bodyweightKg={profile.weight}
          unit={profile.unit}
          locale={locale}
        />

        {/* 2. ANNUAL WORKOUT ACTIVITY MATRIX (GITHUB STYLE) */}
        <ActivityHeatmap workoutsHistory={workoutsHistory} weeks={16} />

        {/* 3. MUSCLE BALANCE RADAR CHART */}
        <MuscleBalanceRadar muscleCounts={stats.muscleTrainedCount} />

        {/* 4. DUAL MANNEQUIN RECOVERY HEATMAP */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View style={styles.musclesWorkedHeader}>
              <Text style={styles.workedPercentage}>{recoveryPercent}%</Text>
              <Text style={styles.workedTitle}>
                {t.profile.targetMusclesFocus}
              </Text>
            </View>
            <Feather name="shield" size={16} color={THEME.accentGreen} />
          </View>

          <DualMannequinFocusPicker
            selectedAreas={profile.targetMuscles ?? []}
            onToggleArea={handleToggleMuscle}
            accentColor={THEME.accentGreen}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void retrySync()}
          style={[styles.cardContainer, { padding: 16 }]}
        >
          <Text
            style={{ color: syncStatus === "error" ? "#F59E0B" : "#94A3B8" }}
          >
            {{
              local: t.profile.syncLocal,
              syncing: t.profile.syncSyncing,
              synced: t.profile.syncSynced,
              error: t.profile.syncError,
            }[syncStatus]}
          </Text>
        </Pressable>
        {/* ACCOUNT & CLOUD SYNC CARD */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionHeaderTitle}>
                {t.profile.accountAndCloud}
              </Text>
              <Text style={styles.timeRemainingSub}>
                {profile.authEmail
                  ? `${t.profile.linkedPrefix} ${profile.authEmail}`
                  : t.profile.syncProgressDesc}
              </Text>
            </View>
            <Feather
              name={profile.authEmail ? "check-circle" : "cloud"}
              size={18}
              color={profile.authEmail ? THEME.accentGreen : THEME.accentBlue}
            />
          </View>

          {profile.authEmail ? (
            <View style={styles.authConnectedRow}>
              <View style={styles.authInfoCol}>
                <Text style={styles.authEmailText}>{profile.authEmail}</Text>
                <Text style={styles.authProviderBadge}>
                  {profile.authProvider === "apple"
                    ? " Apple ID"
                    : profile.authProvider === "email"
                      ? "Email"
                      : "Google"}
                </Text>
              </View>
              <Pressable
                disabled={authBusy}
                onPress={() => void runAuth(logoutAuth)}
                style={styles.signOutBtn}
              >
                <Text style={styles.signOutText}>
                  {t.profile.signOut}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.authButtonsStack}>
              {appleAvailable && (
                <Pressable
                  disabled={authBusy}
                  onPress={() => void runAuth(handleAppleSignIn)}
                  style={styles.appleSignInBtn}
                >
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleSignInText}>
                    {t.profile.signInApple}
                  </Text>
                </Pressable>
              )}
              <Pressable
                disabled={authBusy}
                onPress={() => void runAuth(handleGoogleSignIn)}
                style={styles.googleSignInBtn}
              >
                <Feather name="globe" size={16} color="#FFFFFF" />
                <Text style={styles.googleSignInText}>
                  {t.profile.signInGoogle}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 4. DIAMOND / PRO MEMBERSHIP CARD */}
        <Pressable
          onPress={() => {
            if (!profile.isPro) setShowPaywall(true);
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: profile.isPro }}
          style={styles.proUpgradeCard}
        >
          <View style={styles.proHeaderRow}>
            <View style={styles.proTitleWrapper}>
              <Text style={styles.proTitleBrand}>TrainXP</Text>
              <View style={styles.diamondBadge}>
                <Text style={styles.diamondText}>DIAMOND</Text>
              </View>
            </View>
            <View style={styles.viewDiamondBtn}>
              <Text style={styles.viewDiamondText}>
                {profile.isPro
                  ? t.profile.proActive
                  : t.profile.proUpgrade}
              </Text>
            </View>
          </View>

          <Text style={styles.proSubtext}>
            {t.profile.proXpPerWorkout}
          </Text>

          <View style={styles.proFeatureList}>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {t.profile.proBenefit1}
              </Text>
            </View>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {t.profile.proBenefit2}
              </Text>
            </View>
            <View style={styles.proFeatureItem}>
              <Feather name="check" size={14} color={THEME.accentGreen} />
              <Text style={styles.proFeatureLabel}>
                {t.profile.proBenefit3}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* 5. 22-SEGMENT EQUALIZER LEVEL PROGRESS */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionHeaderTitle}>
              {t.profile.levelProgression}
            </Text>
            <Text style={styles.xpText}>
              {stats.xp} / {stats.xpToNext} XP
            </Text>
          </View>

          <View style={styles.barsTrack}>
            {Array.from({ length: TOTAL_BARS }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.segmentBar,
                  idx < filledBars
                    ? { backgroundColor: THEME.accentGreen }
                    : { backgroundColor: "#1C2638" },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 6. WEEKLY RPG QUESTS */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionHeaderTitle}>
                {t.profile.weeklyDirectives}
              </Text>
              <Text style={styles.timeRemainingSub}>
                {t.profile.daysRemaining.replace("{days}", String(remainingDays))}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowChallenges(!showChallenges);
              }}
              style={styles.viewChallengesLink}
            >
              <Text style={styles.viewChallengesText}>
                {showChallenges
                  ? t.profile.collapse
                  : t.profile.expand}
              </Text>
              <Feather
                name={showChallenges ? "chevron-up" : "chevron-down"}
                size={14}
                color={THEME.textMuted}
              />
            </Pressable>
          </View>

          {showChallenges && (
            <View style={styles.challengesList}>
              {CHALLENGES.map((item) => (
                <View key={item.id} style={styles.challengeRow}>
                  <Text style={styles.challengeLabel}>{item.label}</Text>
                  <View
                    style={[
                      styles.circleCheck,
                      item.done && {
                        borderColor: THEME.accentGreen,
                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                      },
                    ]}
                  >
                    {item.done && (
                      <Feather
                        name="check"
                        size={12}
                        color={THEME.accentGreen}
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Learning, preferences and support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle} accessibilityRole="header">
            {t.profile.resourcesAndSupport}
          </Text>
          <Text style={styles.supportSubtitle}>
            {t.profile.resourcesDesc}
          </Text>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMetricsModal(true);
            }}
            style={({ pressed }) => [
              styles.guideFeature,
              pressed && styles.actionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.profile.metricGuide}
          >
            <View style={styles.guideFeatureTop}>
              <View style={styles.guideFeatureIcon}>
                <Feather name="book-open" size={22} color={THEME.accentBlue} />
              </View>
              <Text style={styles.guideFeatureTag}>
                {t.profile.metrics7Tag}
              </Text>
              <Feather
                name="arrow-up-right"
                size={20}
                color={THEME.accentBlue}
              />
            </View>
            <Text style={styles.guideFeatureTitle}>
              {t.profile.metricGuide}
            </Text>
            <Text style={styles.guideFeatureSub}>
              {t.profile.metricGuideSub}
            </Text>
            <View style={styles.guideFeatureLink}>
              <Text style={styles.guideFeatureLinkText}>
                {t.profile.exploreGuide}
              </Text>
              <Feather name="arrow-right" size={15} color={THEME.accentBlue} />
            </View>
          </Pressable>

          <View style={styles.supportRows}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSettingsModal(true);
              }}
              style={({ pressed }) => [
                styles.systemActionBtn,
                styles.supportRowDivider,
                pressed && styles.actionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.profile.appSettings}
            >
              <View style={styles.systemActionIconBox}>
                <Feather name="sliders" size={18} color={THEME.textMuted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.systemActionTitle}>
                  {t.profile.appSettings}
                </Text>
                <Text style={styles.systemActionSub}>
                  {t.profile.appSettingsSub}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={THEME.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowFeedbackModal(true);
              }}
              style={({ pressed }) => [
                styles.systemActionBtn,
                styles.supportRowDivider,
                pressed && styles.actionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.profile.feedback}
            >
              <View style={styles.systemActionIconBox}>
                <Feather
                  name="message-circle"
                  size={18}
                  color={THEME.textMuted}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.systemActionTitle}>
                  {t.profile.feedback}
                </Text>
                <Text style={styles.systemActionSub}>
                  {t.profile.feedbackSub}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={THEME.textMuted} />
            </Pressable>
            <Pressable
              onPress={handleResetOnboarding}
              style={({ pressed }) => [
                styles.systemActionBtn,
                pressed && styles.actionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.profile.resetOnboarding}
            >
              <View style={styles.systemActionIconBox}>
                <Feather name="refresh-cw" size={18} color="#38BDF8" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.systemActionTitle, { color: "#38BDF8" }]}>
                  {t.profile.resetOnboarding}
                </Text>
                <Text style={styles.systemActionSub}>
                  {t.profile.restart25Steps}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={THEME.textMuted} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* PRO PAYWALL MODAL */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={() => setShowPaywall(false)}
        onSuccess={() => setShowPaywall(false)}
      />

      {/* SETTINGS & LANGUAGE MODAL */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDim}
            onPress={() => setShowSettingsModal(false)}
          />
          <View
            style={[
              styles.settingsSheet,
              { maxHeight: "90%", paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleWrap}>
                <Feather name="settings" size={20} color="#38BDF8" />
                <Text style={styles.settingsSheetTitle}>
                  {t.profile.settings}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={t.profile.closeSettings}
              >
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Language Selector */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingGroupLabel}>
                  {t.profile.language}
                </Text>
                <View style={styles.langSwitchRow}>
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      void setLocale("vi");
                    }}
                    style={[
                      styles.langOptionBtn,
                      locale === "vi" && styles.langOptionBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        locale === "vi" && styles.langOptionTextActive,
                      ]}
                    >
                      🇻🇳 Tiếng Việt
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );
                      void setLocale("en");
                    }}
                    style={[
                      styles.langOptionBtn,
                      locale === "en" && styles.langOptionBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        locale === "en" && styles.langOptionTextActive,
                      ]}
                    >
                      🇺🇸 English
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 2. Units */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingGroupLabel}>
                  {t.profile.unitSystem}
                </Text>
                <View style={styles.langSwitchRow}>
                  {(["Metric", "Imperial"] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      style={[
                        styles.langOptionBtn,
                        profile.unit === unit && styles.langOptionBtnActive,
                      ]}
                      onPress={() => updateProfile({ unit })}
                    >
                      <Text
                        style={[
                          styles.langOptionText,
                          profile.unit === unit && styles.langOptionTextActive,
                        ]}
                      >
                        {unit === "Metric"
                          ? "Metric (kg / cm)"
                          : "Imperial (lb / in)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* 3. Workout Preferences & Toggles */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingGroupLabel}>
                  {t.profile.workoutPreferences}
                </Text>

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.toggleTitle}>
                      {t.profile.autoRestTimer}
                    </Text>
                    <Text style={styles.toggleDesc}>
                      {t.profile.autoRestTimerDesc}
                    </Text>
                  </View>
                  <Switch
                    value={autoRestTimer}
                    onValueChange={toggleAutoRest}
                    trackColor={{ false: "#1E293B", true: "#38BDF8" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.toggleTitle}>
                      {t.profile.soundAndHaptics}
                    </Text>
                    <Text style={styles.toggleDesc}>
                      {t.profile.soundAndHapticsDesc}
                    </Text>
                  </View>
                  <Switch
                    value={soundEnabled}
                    onValueChange={toggleSound}
                    trackColor={{ false: "#1E293B", true: "#38BDF8" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* 4. Guides & Support Actions */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingGroupLabel}>
                  {t.profile.scienceAndSupport}
                </Text>

                <Pressable
                  onPress={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => setShowMetricsModal(true), 250);
                  }}
                  style={styles.settingActionRow}
                >
                  <View
                    style={[
                      styles.settingActionIcon,
                      { backgroundColor: "rgba(56, 189, 248, 0.1)" },
                    ]}
                  >
                    <Feather
                      name="book-open"
                      size={18}
                      color={THEME.accentBlue}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingActionTitle}>
                      {t.profile.metricGuide}
                    </Text>
                    <Text style={styles.settingActionSub}>
                      {t.profile.metricGuideSub}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#64748B" />
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => setShowFeedbackModal(true), 250);
                  }}
                  style={styles.settingActionRow}
                >
                  <View
                    style={[
                      styles.settingActionIcon,
                      { backgroundColor: "rgba(249, 115, 22, 0.12)" },
                    ]}
                  >
                    <Feather name="message-square" size={16} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingActionTitle}>
                      {t.profile.feedback}
                    </Text>
                    <Text style={styles.settingActionSub}>
                      {t.profile.feedbackSub}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#64748B" />
                </Pressable>

                {STORE_URL ? (
                  <Pressable
                    onPress={handleRateApp}
                    style={styles.settingActionRow}
                  >
                    <View
                      style={[
                        styles.settingActionIcon,
                        { backgroundColor: "rgba(234, 179, 8, 0.12)" },
                      ]}
                    >
                      <Feather name="star" size={16} color="#EAB308" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingActionTitle}>
                        {t.profile.rateApp}
                      </Text>
                      <Text style={styles.settingActionSub}>
                        {t.profile.rateAppSub}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#64748B" />
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleResetOnboarding}
                  style={[styles.settingActionRow, { borderBottomWidth: 0 }]}
                >
                  <View
                    style={[
                      styles.settingActionIcon,
                      { backgroundColor: "rgba(56, 189, 248, 0.12)" },
                    ]}
                  >
                    <Feather name="refresh-cw" size={16} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.settingActionTitle, { color: "#38BDF8" }]}
                    >
                      {t.profile.resetOnboarding}
                    </Text>
                    <Text style={styles.settingActionSub}>
                      {t.profile.restartAssessmentSub}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#64748B" />
                </Pressable>
              </View>

              {/* 5. Account / Tester Sign In Row */}
              <View style={styles.settingGroup}>
                <Text style={styles.settingGroupLabel}>
                  {t.profile.accountAndSync}
                </Text>
                {profile.authEmail ? (
                  <View style={styles.accountCardModal}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountEmailText} numberOfLines={1}>
                        {profile.authEmail}
                      </Text>
                      <Text style={styles.accountProviderText}>
                        Provider: {profile.authProvider || "email"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        void runAuth(async () => {
                          await logoutAuth();
                          setShowSettingsModal(false);
                        })
                      }
                      style={styles.logoutSmallBtn}
                    >
                      <Text style={styles.logoutSmallBtnText}>
                        {t.profile.signOut}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setShowSettingsModal(false);
                      setTimeout(() => setShowLoginModal(true), 250);
                    }}
                    style={styles.loginModalTriggerBtn}
                  >
                    <Feather name="log-in" size={16} color="#38BDF8" />
                    <Text style={styles.loginModalTriggerText}>
                      {t.profile.signInAccount}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* 6. Legal Links */}
              <View style={styles.legalSectionModal}>
                <Pressable
                  onPress={() =>
                    void Linking.openURL(TERMS_OF_USE_URL).catch(() =>
                      Alert.alert(
                        t.profile.unableToOpenLink,
                      ),
                    )
                  }
                  style={styles.legalLinkRow}
                >
                  <Feather name="file-text" size={15} color={THEME.textMuted} />
                  <Text style={styles.legalLinkModalText}>
                    {t.profile.termsOfUse}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    void Linking.openURL(PRIVACY_POLICY_URL).catch(() =>
                      Alert.alert(
                        t.profile.unableToOpenLink,
                      ),
                    )
                  }
                  style={styles.legalLinkRow}
                >
                  <Feather name="shield" size={15} color={THEME.textMuted} />
                  <Text style={styles.legalLinkModalText}>
                    {t.profile.privacyPolicy}
                  </Text>
                </Pressable>
              </View>

              {/* Apple Guideline 5.1.1(v): Permanent Account Deletion */}
              <Pressable
                onPress={handleDeleteAccount}
                style={styles.deleteAccountBtnRow}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
                <Text style={styles.deleteAccountBtnText}>
                  {t.profile.deleteAccountPermanently}
                </Text>
              </Pressable>

              {/* Version & Build Branding */}
              <View style={styles.versionCardWrap}>
                <Text style={styles.versionBrandText}>
                  TrainXP · Cybernetic Workout Companion
                </Text>
                <Text style={styles.versionNumberText}>
                  Version 1.0.0 (Build 42) · Production Release
                </Text>
              </View>

              {/* Close Button */}
              <Pressable
                onPress={() => setShowSettingsModal(false)}
                style={styles.closeSettingsBtn}
              >
                <Text style={styles.closeSettingsText}>{t.common.done}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TRAINING METRICS & SCIENCE GUIDE MODAL */}
      <TrainingMetricsModal
        visible={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
      />

      {/* USER FEEDBACK & FEATURE REQUEST MODAL */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        userEmail={profile.authEmail}
      />

      {/* Tester & Existing Account Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  profileTitle: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.7,
    color: THEME.textMain,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161D2B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222E42",
  },
  streakFire: { fontSize: 14 },
  streakCount: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#161D2B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222E42",
  },
  heroSection: { alignItems: "center", marginVertical: 8 },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarCenter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#131A29",
    borderWidth: 2,
    borderColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#080C14",
  },
  levelText: { color: "#080C14", fontSize: 12, fontWeight: "900" },
  profileName: { color: "#FFF", fontSize: 18, fontWeight: "800", marginBottom: 2 },
  userRole: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 14,
  },
  tripleStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1A2333",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 12,
  },
  biometricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F1626",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    width: "100%",
  },
  bioItem: {
    minWidth: 110,
    flexGrow: 1,
    alignItems: "center",
    flex: 1,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bioValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFF",
  },
  bioDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#1E293B",
  },
  statCol: { flex: 1, alignItems: "center", gap: 3 },
  statNumber: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  statLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  statDivider: { width: 1, height: 24, backgroundColor: "#1E293B" },

  /* Radar Card */
  radarCard: {
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1A2333",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  radarHeader: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  radarSvgWrap: { alignItems: "center", justifyContent: "center" },
  radarLabelsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 8,
  },
  radarBadge: {
    backgroundColor: "#162030",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#233248",
  },
  radarBadgeText: { color: "#38BDF8", fontSize: 12, fontWeight: "700" },

  /* Card General */
  cardContainer: {
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1A2333",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  musclesWorkedHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  workedPercentage: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "800",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  workedTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  /* Diamond Pro Card */
  proUpgradeCard: {
    backgroundColor: "#111724",
    borderWidth: 1.5,
    borderColor: "#818CF8",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  proHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  proTitleWrapper: { flexDirection: "row", alignItems: "center", gap: 6 },
  proTitleBrand: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  diamondBadge: {
    backgroundColor: "rgba(129, 140, 248, 0.2)",
    borderWidth: 1,
    borderColor: "#818CF8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diamondText: { color: "#818CF8", fontSize: 12, fontWeight: "800" },
  viewDiamondBtn: {
    backgroundColor: "#818CF8",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewDiamondText: { color: "#090D16", fontSize: 12, fontWeight: "800" },
  proSubtext: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  proFeatureList: { gap: 6 },
  proFeatureItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  proFeatureLabel: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },

  /* Level Progression */
  sectionHeaderTitle: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  xpText: { color: "#22C55E", fontSize: 12, fontWeight: "800" },
  barsTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 3,
    marginTop: 8,
  },
  segmentBar: { flex: 1, height: 18, borderRadius: 2 },

  /* Challenges */
  timeRemainingSub: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  viewChallengesLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewChallengesText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  challengesList: { gap: 8, marginTop: 8 },
  challengeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeLabel: { color: "#CBD5E1", fontSize: 12, flex: 1 },
  circleCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Settings Modal */
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modalDim: { flex: 1 },
  settingsSheet: {
    backgroundColor: "#111724",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 16,
  },
  settingsSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    flexShrink: 1,
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 10,
  },
  langSwitchRow: {
    flexDirection: "row",
    gap: 10,
  },
  langOptionBtn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    backgroundColor: "#162032",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
    alignItems: "center",
  },
  langOptionBtnActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#13233A",
  },
  langOptionText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  langOptionTextActive: {
    color: "#38BDF8",
    fontWeight: "700",
  },
  /* Auth & Account Card */
  authConnectedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F1626",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  authInfoCol: {
    flex: 1,
    gap: 4,
  },
  authEmailText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  authProviderBadge: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#1E293B",
    borderRadius: 8,
  },
  signOutText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  authButtonsStack: {
    gap: 10,
    marginTop: 12,
  },
  appleSignInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 48,
    gap: 8,
  },
  appleIcon: {
    fontSize: 20,
    color: "#000000",
    fontWeight: "700",
    marginTop: -2,
  },
  appleSignInText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
  googleSignInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  googleSignInText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Legal & Delete Account in Modal */
  legalSectionModal: {
    gap: 10,
    marginBottom: 16,
    paddingVertical: 6,
  },
  legalLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  legalLinkModalText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  deleteAccountBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginBottom: 18,
  },
  deleteAccountBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },

  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#162032",
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  toggleDesc: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    lineHeight: 16,
  },
  settingActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#162032",
  },
  settingActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  settingActionSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  versionCardWrap: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 3,
  },
  versionBrandText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  versionNumberText: {
    fontSize: 11,
    color: "#64748B",
  },
  closeSettingsBtn: {
    backgroundColor: "#38BDF8",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeSettingsText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#080C14",
  },
  supportSection: { marginTop: 8, marginBottom: 12 },
  supportTitle: {
    color: THEME.textMain,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  supportSubtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  guideFeature: {
    backgroundColor: "#101F30",
    borderWidth: 1,
    borderColor: "#25445C",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  guideFeatureTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  guideFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,189,248,0.1)",
  },
  guideFeatureTag: {
    flex: 1,
    color: THEME.accentBlue,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  guideFeatureTitle: {
    color: THEME.textMain,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  guideFeatureSub: {
    color: "#A8B9CC",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  guideFeatureLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  guideFeatureLinkText: {
    color: THEME.accentBlue,
    fontSize: 13,
    fontWeight: "600",
  },
  supportRows: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 18,
    overflow: "hidden",
  },
  supportRowDivider: { borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  actionPressed: { opacity: 0.7 },
  systemActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    minHeight: 80,
  },
  systemActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  systemActionTitle: {
    color: THEME.textMain,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  systemActionSub: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  accountCardModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161F32",
    borderWidth: 1,
    borderColor: "#222E42",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    gap: 10,
  },
  accountEmailText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  accountProviderText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  logoutSmallBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutSmallBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  loginModalTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 14,
  },
  loginModalTriggerText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "700",
  },
});
