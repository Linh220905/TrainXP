import { WelcomeScreen } from "@/components/WelcomeScreen";
import { cancelWorkoutReminders, requestWorkoutReminders } from "@/lib/notifications";
import { BenchmarkInput } from "@/components/BenchmarkInput";
import { ageOn, toggleFocus } from "@/lib/input";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Text, TextInput } from "@/components/AppTypography";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeJson, removeStored } from "@/lib/storage";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { BiometricFingerprintConfirm } from "@/components/BiometricFingerprintConfirm";
import { DobWheelPicker } from "@/components/DobWheelPicker";
import {
  DualMannequinFocusPicker,
  type FocusArea,
} from "@/components/DualMannequinFocusPicker";
import { HorizontalRulerPicker } from "@/components/HorizontalRulerPicker";
import { PaywallModal } from "@/components/PaywallModal";
import { LoginModal } from "@/components/LoginModal";
import { GoogleLogo } from "@/components/GoogleLogo";
import {
  useAppState,
  type BodyType,
  type Experience,
  type Gender,
  type PrimaryGoal,
  type Profile,
  type UnitSystem,
} from "@/context/AppState";
import { useI18n } from "@/lib/i18n";
import {
  calculateInitialGamification,
  STREAK_COMMITMENT_OPTIONS,
  type GamificationResult,
} from "@/lib/onboardingGamification";
import { generatePersonalizedPlan } from "@/lib/planGenerator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Electric Cyan Blue Brand Palette
const BLUE_THEME = {
  primary: "#38BDF8",
  primaryDark: "#0284C7",
  bgDark: "#090D16",
  cardDark: "#151D2D",
  cardBorder: "#27354D",
  subText: "#94A3B8",
  white: "#FFFFFF",
  gold: "#F59E0B",
  bronze: "#B45309",
  silver: "#94A3B8",
  green: "#22C55E",
  flame: "#F97316",
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

// Equipment list for TrainXP
const EQUIPMENT_CATEGORIES = [
  {
    category: "Small weights",
    items: ["Dumbbell", "Kettlebell"],
  },
  {
    category: "Bars & Plates",
    items: ["Barbell", "Plate", "Ez Bar"],
  },
  {
    category: "Equipment",
    items: ["Bench", "Cable Machine", "Machines"],
  },
];

// Equipment SVGs
function EquipmentSvg({ name }: { name: string }) {
  switch (name) {
    case "Dumbbell":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Defs>
            <LinearGradient id="dbBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#94A3B8" />
              <Stop offset="50%" stopColor="#CBD5E1" />
              <Stop offset="100%" stopColor="#94A3B8" />
            </LinearGradient>
            <LinearGradient id="dbPlateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#64748B" />
              <Stop offset="50%" stopColor="#94A3B8" />
              <Stop offset="100%" stopColor="#475569" />
            </LinearGradient>
          </Defs>
          <Rect
            x="14"
            y="20"
            width="16"
            height="4"
            rx="2"
            fill="url(#dbBarGrad)"
          />
          <Rect
            x="8"
            y="14"
            width="6"
            height="16"
            rx="2.5"
            fill="url(#dbPlateGrad)"
            stroke="#475569"
            strokeWidth="1"
          />
          <Rect
            x="4"
            y="16"
            width="4"
            height="12"
            rx="2"
            fill="url(#dbPlateGrad)"
            stroke="#334155"
            strokeWidth="0.8"
          />
          <Rect
            x="30"
            y="14"
            width="6"
            height="16"
            rx="2.5"
            fill="url(#dbPlateGrad)"
            stroke="#475569"
            strokeWidth="1"
          />
          <Rect
            x="36"
            y="16"
            width="4"
            height="12"
            rx="2"
            fill="url(#dbPlateGrad)"
            stroke="#334155"
            strokeWidth="0.8"
          />
        </Svg>
      );
    case "Kettlebell":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Defs>
            <LinearGradient id="kbBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#475569" />
              <Stop offset="100%" stopColor="#0F172A" />
            </LinearGradient>
          </Defs>
          <Path
            d="M16,14 C16,9 28,9 28,14 L28,18 L16,18 Z"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Circle
            cx="22"
            cy="27"
            r="12"
            fill="url(#kbBodyGrad)"
            stroke="#64748B"
            strokeWidth="1"
          />
          <Circle cx="19" cy="23" r="3" fill="#94A3B8" opacity={0.3} />
        </Svg>
      );
    case "Barbell":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Line
            x1="6"
            y1="38"
            x2="38"
            y2="6"
            stroke="#E2E8F0"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <G transform="rotate(-45 22 22)">
            <Rect
              x="12"
              y="15"
              width="4"
              height="14"
              rx="1.5"
              fill="#475569"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <Rect
              x="8"
              y="13"
              width="4"
              height="18"
              rx="2"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="1"
            />
            <Rect
              x="28"
              y="15"
              width="4"
              height="14"
              rx="1.5"
              fill="#475569"
              stroke="#334155"
              strokeWidth="0.8"
            />
            <Rect
              x="32"
              y="13"
              width="4"
              height="18"
              rx="2"
              fill="#1E293B"
              stroke="#475569"
              strokeWidth="1"
            />
          </G>
        </Svg>
      );
    case "Plate":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Circle
            cx="22"
            cy="22"
            r="16"
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="2"
          />
          <Circle
            cx="22"
            cy="22"
            r="11"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
          />
          <Circle
            cx="22"
            cy="22"
            r="5"
            fill="#0F172A"
            stroke="#94A3B8"
            strokeWidth="2"
          />
          <Circle cx="22" cy="22" r="2.5" fill="#090D16" />
        </Svg>
      );
    case "Ez Bar":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Path
            d="M6,36 L14,28 L20,32 L26,26 L32,30 L38,24"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect
            x="9"
            y="27"
            width="3"
            height="10"
            rx="1"
            fill="#475569"
            transform="rotate(-30 9 27)"
          />
          <Rect
            x="33"
            y="19"
            width="3"
            height="10"
            rx="1"
            fill="#475569"
            transform="rotate(-30 33 19)"
          />
        </Svg>
      );
    case "Bench":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Rect
            x="6"
            y="18"
            width="32"
            height="6"
            rx="2"
            fill="#1E293B"
            stroke="#64748B"
            strokeWidth="1.2"
          />
          <Line
            x1="12"
            y1="24"
            x2="12"
            y2="34"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Line
            x1="32"
            y1="24"
            x2="32"
            y2="34"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Line
            x1="8"
            y1="34"
            x2="16"
            y2="34"
            stroke="#64748B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Line
            x1="28"
            y1="34"
            x2="36"
            y2="34"
            stroke="#64748B"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Svg>
      );
    case "Machines":
    case "Cable Machine":
      return (
        <Svg width="40" height="40" viewBox="0 0 44 44">
          <Rect x="10" y="8" width="4" height="28" fill="#475569" />
          <Rect x="30" y="8" width="4" height="28" fill="#475569" />
          <Line x1="8" y1="8" x2="36" y2="8" stroke="#94A3B8" strokeWidth="3" />
          <Line
            x1="8"
            y1="36"
            x2="36"
            y2="36"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          <Rect
            x="16"
            y="14"
            width="12"
            height="16"
            rx="2"
            fill="#1E293B"
            stroke="#334155"
            strokeWidth="1"
          />
          <Line
            x1="22"
            y1="8"
            x2="22"
            y2="14"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          <Circle cx="22" cy="20" r="2.5" fill="#EF4444" />
        </Svg>
      );
    default:
      return <Feather name="disc" size={24} color={BLUE_THEME.primary} />;
  }
}

// 3D Metallic Gold Trophy SVG
function TrophyHeroSvg({ size = 130 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="goldCup" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FDE047" />
          <Stop offset="40%" stopColor="#EAB308" />
          <Stop offset="100%" stopColor="#A16207" />
        </LinearGradient>
        <LinearGradient id="goldBase" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#713F12" />
          <Stop offset="50%" stopColor="#451A03" />
          <Stop offset="100%" stopColor="#1E293B" />
        </LinearGradient>
        <LinearGradient id="goldHandles" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FEF08A" />
          <Stop offset="100%" stopColor="#CA8A04" />
        </LinearGradient>
      </Defs>
      <Path
        d="M32 36 C14 36 12 56 30 64 L34 60 C22 54 22 42 34 42 Z"
        fill="url(#goldHandles)"
      />
      <Path
        d="M88 36 C106 36 108 56 90 64 L86 60 C98 54 98 42 86 42 Z"
        fill="url(#goldHandles)"
      />
      <Path
        d="M32 26 L88 26 C88 52 74 68 60 68 C46 68 32 52 32 26 Z"
        fill="url(#goldCup)"
        stroke="#FEF08A"
        strokeWidth="1.5"
      />
      <Rect x="30" y="24" width="60" height="6" rx="3" fill="#FEF08A" />
      <Rect x="54" y="68" width="12" height="16" rx="2" fill="url(#goldCup)" />
      <Path d="M44 84 L76 84 L80 94 L40 94 Z" fill="url(#goldCup)" />
      <Rect
        x="32"
        y="94"
        width="56"
        height="16"
        rx="4"
        fill="url(#goldBase)"
        stroke="#B45309"
        strokeWidth="1.5"
      />
      <Path
        d="M60 38 L62.5 45 L70 45 L64 49.5 L66.5 56.5 L60 52 L53.5 56.5 L56 49.5 L50 45 L57.5 45 Z"
        fill="#FFFFFF"
        opacity={0.9}
      />
      <Circle cx="86" cy="22" r="3" fill="#FEF08A" opacity={0.8} />
      <Circle cx="30" cy="68" r="2.5" fill="#FEF08A" opacity={0.8} />
    </Svg>
  );
}

// Multi-layered Flame SVG for Streak
function FlameHeroSvg() {
  return (
    <Svg width="110" height="110" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="flameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#EA580C" />
          <Stop offset="50%" stopColor="#F97316" />
          <Stop offset="100%" stopColor="#FBBF24" />
        </LinearGradient>
        <LinearGradient id="flameInner" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#FEF08A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 10 C50 10 30 32 30 54 C30 68 40 82 50 86 C60 82 70 68 70 54 C70 38 60 26 56 20 C54 28 48 34 48 34 C48 34 56 22 50 10 Z"
        fill="url(#flameOuter)"
      />
      <Path
        d="M50 42 C50 42 40 52 40 64 C40 73 45 78 50 80 C55 78 60 73 60 64 C60 55 54 48 50 42 Z"
        fill="url(#flameInner)"
      />
    </Svg>
  );
}

// Total number of onboarding steps (0 to 24 = 25 steps total)
const TOTAL_STEPS = 24;
const ONBOARDING_DRAFT_KEY = "@train-xp/onboarding-draft";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const {
    hydrated,
    hasOnboarded,
    completeOnboarding,
    loginGoogle,
    loginApple,
    loginPassword,
    profile: savedProfile,
    workoutsHistory: savedHistory,
    bodyweightLogs: savedLogs,
  } = useAppState();
  const { t, locale } = useI18n();

  // Navigation state
  const [step, setStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [routinePrepProgress, setRoutinePrepProgress] = useState(15);

  // In-line Login State (Step 23)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Profile responses
  const [profile, setProfile] = useState<Profile>(() =>
    savedLogs.length > 0 || savedHistory.length > 0 || savedProfile.username
      ? { ...savedProfile }
      : {
          name: "Lifter",
          unit: "Metric",
          weight: 68,
          height: 170,
          thinkAboutFitness: "Often",
          achieveMotivations: ["Health & Wellness", "Build Discipline"],
          goal: "Build Muscle",
          sensitiveJoints: [],
          experience: "No experience",
          hasRoutine: true,
          equipment: ["Dumbbell", "Barbell", "Bench", "Plate", "Cable Machine"],
          lastMusclesWorked: ["Chest", "Arms"],
          workoutDuration: "60 minutes",
          daysPerWeek: 3,
          targetMuscles: ["Full chest", "Big arms", "Broad shoulders"],
          bodyType: "Athletic",
          gender: "Male",
          birthYear: 2000,
          birthMonth: "Dec",
          birthDay: 10,
          benchPressPR: 0,
          prSquat: 0,
          deadliftPR: 0,
          goalWeight: 75,
          goalWeeks: 4,
          streakCommitment: 30,
          notificationsEnabled: false,
          referralSource: "tiktok",
          isPro: false,
        },
  );

  const authLock = useRef(false);
  const completionLock = useRef(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [prValidity, setPrValidity] = useState<Record<number, boolean>>({
    8: true,
    9: true,
    10: true,
  });
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (!hydrated || hasOnboarded) return;
    let cancelled = false;
    void AsyncStorage.getItem(ONBOARDING_DRAFT_KEY)
      .then((raw) => {
        if (!raw || cancelled) return;
        const draft = JSON.parse(raw);
        if (
          Number.isInteger(draft.step) &&
          draft.step >= 0 &&
          draft.step <= TOTAL_STEPS
        )
          setStep(draft.step);
        if (
          draft.profile &&
          typeof draft.profile === "object" &&
          !Array.isArray(draft.profile)
        )
          setProfile((current) => ({ ...current, ...draft.profile }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDraftRestored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, hasOnboarded]);

  useEffect(() => {
    if (!hydrated || hasOnboarded || !draftRestored) return;
    void writeJson(ONBOARDING_DRAFT_KEY, { step, profile }).catch(() => undefined);
  }, [hydrated, hasOnboarded, draftRestored, step, profile]);

  const handleDobChange = (
    { day, month, year }: { day: number; month: string; year: number }
  ) => {
    setProfile((prev) => {
      if (
        prev.birthDay === day &&
        prev.birthMonth === month &&
        prev.birthYear === year
      ) {
        return prev;
      }
      return {
        ...prev,
        birthDay: day,
        birthMonth: month,
        birthYear: year,
      };
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step, carouselIndex]);

  // Gamification calculations for PR assessment & Level Roadmap
  const gamification: GamificationResult = useMemo(() => {
    return calculateInitialGamification({
      benchKg: profile.benchPressPR,
      squatKg: profile.prSquat,
      deadliftKg: profile.deadliftPR,
      bodyweightKg: profile.weight,
      unit: profile.unit,
    });
  }, [
    profile.benchPressPR,
    profile.prSquat,
    profile.deadliftPR,
    profile.weight,
    profile.unit,
  ]);

  const hasAnyPR = useMemo(() => {
    return (
      (profile.benchPressPR && profile.benchPressPR > 0) ||
      (profile.prSquat && profile.prSquat > 0) ||
      (profile.deadliftPR && profile.deadliftPR > 0)
    );
  }, [profile.benchPressPR, profile.prSquat, profile.deadliftPR]);

  useEffect(() => {
    if (hydrated && hasOnboarded) {
      router.replace("/(tabs)");
    }
  }, [hydrated, hasOnboarded]);

  useEffect(() => {
    if (step !== 19) return;
    setRoutinePrepProgress(15);
    let progress = 15;
    let completion: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      progress = Math.min(100, progress + 20);
      setRoutinePrepProgress(progress);
      if (progress === 100) {
        clearInterval(interval);
        completion = setTimeout(() => setStep(20), 600);
      }
    }, 280);
    return () => {
      clearInterval(interval);
      clearTimeout(completion);
    };
  }, [step]);
  const routinePreview = useMemo(
    () => generatePersonalizedPlan(profile).routines,
    [profile],
  );

  if (!hydrated || hasOnboarded)
    return (
      <View style={styles.loading}>
        <Text>{t.onboarding.loadingProfile}</Text>
      </View>
    );

  // Next Step Transition with Arrow Dynamic Branching
  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Step 0: ValueProp Carousel (advance slide first if < 2)
    if (step === 0 && carouselIndex < 2) {
      setCarouselIndex(carouselIndex + 1);
      return;
    }

    // Validation checks
    if (step === 3) {
      const calculatedAge = ageOn(
        profile.birthYear,
        profile.birthMonth,
        profile.birthDay,
      );
      if (calculatedAge === null || calculatedAge < 13) {
        Alert.alert(
          t.onboarding.invalidDobTitle,
          t.onboarding.invalidDobMsg,
        );
        return;
      }
    }
    if (
      step === 5 &&
      (!Number.isFinite(profile.weight) ||
        profile.weight < 15 ||
        profile.weight > 300)
    ) {
      Alert.alert(
        t.onboarding.invalidWeightTitle,
        t.onboarding.invalidWeightMsg,
      );
      return;
    }
    if (
      step === 6 &&
      (!Number.isFinite(profile.height) ||
        profile.height < 80 ||
        profile.height > 250)
    ) {
      Alert.alert(
        t.onboarding.invalidHeightTitle,
        t.onboarding.invalidHeightMsg,
      );
      return;
    }

    if (step >= 8 && step <= 10 && !prValidity[step]) {
      Alert.alert(
        t.onboarding.invalidBenchmarkTitle,
        t.onboarding.invalidBenchmarkMsg,
      );
      return;
    }
    if (step === 21 && !profile.name.trim()) {
      Alert.alert(
        t.onboarding.checkProfileTitle,
        t.onboarding.checkProfileMsg,
      );
      return;
    }
    if (step === 17) {
      if (authLock.current) return;
      authLock.current = true;
      setAuthLoading(true);
      const schedule = generatePersonalizedPlan(profile).weekSchedule;
      const days = Object.entries(schedule)
        .filter(([, routine]) => routine !== null)
        .map(([day]) => Number(day));
      void requestWorkoutReminders(days, locale)
        .then((enabled) => {
          setProfile((p) => ({ ...p, notificationsEnabled: enabled }));
          setStep(18);
        })
        .catch(() => {
          setProfile((p) => ({ ...p, notificationsEnabled: false }));
          setStep(18);
        })
        .finally(() => {
          authLock.current = false;
          setAuthLoading(false);
        });
      return;
    }
    // Dynamic branching on Deadlift PR (Step 10):
    // If no PRs were entered, skip TrophyUnlock (Step 11) directly to LevelJourney (Step 12)
    if (step === 10) {
      if (!hasAnyPR) {
        setStep(12);
        return;
      }
    }

    if (step === 23) {
      // Must authenticate to advance from the account screen.
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setShowPaywall(true);
    }
  };

  // Back Step Transition
  const back = () => {
    void Haptics.selectionAsync();

    // Step 0 Carousel back
    if (step === 0 && carouselIndex > 0) {
      setCarouselIndex((curr) => curr - 1);
      return;
    }

    // If at LevelJourney (Step 12) and user had 0 PRs, jumping back bypasses TrophyUnlock (Step 11) to Deadlift (Step 10)
    if (step === 12 && !hasAnyPR) {
      setStep(10);
      return;
    }

    if (step > 0) {
      setStep((curr) => curr - 1);
    }
  };

  const handleFinishOnboarding = (isPro = false) => {
    if (completionLock.current) return;
    completionLock.current = true;
    setShowPaywall(false);
    completeOnboarding({ ...profile, isPro: savedProfile.isPro || isPro });
    void removeStored(ONBOARDING_DRAFT_KEY);
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 150);
  };

  const handleExistingAccountLogin = async (
    provider: "apple" | "google" = Platform.OS === "ios" ? "apple" : "google",
  ) => {
    if (authLock.current) return;
    authLock.current = true;
    setAuthLoading(true);
    try {
      const signedIn =
        provider === "apple" ? await loginApple() : await loginGoogle();
      if (!signedIn) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep(TOTAL_STEPS);
    } catch (error) {
      Alert.alert(
        t.onboarding.signInFailedTitle,
        error instanceof Error ? error.message : t.onboarding.signInFailedMsg,
      );
    } finally {
      authLock.current = false;
      setAuthLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const trimmedId = loginIdentifier.trim();
    const trimmedPass = loginPasswordInput.trim();

    if (!trimmedId || !trimmedPass) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        t.onboarding.missingFieldsTitle,
        t.onboarding.missingFieldsMsg,
      );
      return;
    }

    if (authLock.current) return;
    authLock.current = true;
    setAuthLoading(true);
    setLoginSubmitting(true);

    try {
      const ok = await loginPassword(trimmedId, trimmedPass);
      if (ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep(TOTAL_STEPS);
      } else {
        throw new Error(t.onboarding.incorrectCredentialsMsg);
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t.onboarding.signInFailedTitle,
        err?.message || t.onboarding.signInFailedMsg,
      );
    } finally {
      authLock.current = false;
      setAuthLoading(false);
      setLoginSubmitting(false);
    }
  };

  const toggleEquipment = (eq: string) => {
    void Haptics.selectionAsync();
    setProfile((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter((item) => item !== eq)
        : [...prev.equipment, eq],
    }));
  };

  const toggleFocusArea = (area: FocusArea) =>
    setProfile((prev) => ({
      ...prev,
      targetMuscles: toggleFocus(prev.targetMuscles, area),
    }));

  const progressRatio = Math.min(
    Math.max((step + 1) / (TOTAL_STEPS + 1), 0.05),
    1,
  );

  // Determine button title
  const buttonText =
    step === 0 && carouselIndex < 2
      ? t.onboarding.continue
      : step === TOTAL_STEPS
        ? t.onboarding.claimOffer
        : step === 20
          ? t.onboarding.confirmRoutine
          : step === 23
            ? t.onboarding.skipAndContinue
            : t.onboarding.continue;

  // The welcome carousel has its own layout; profile questions begin at step 1.
  if (step === 0) {
    return (
      <>
        <WelcomeScreen
          index={carouselIndex}
          onIndexChange={setCarouselIndex}
          onContinue={next}
          onSkip={() => {
            void Haptics.selectionAsync().catch(() => undefined);
            setStep(1);
          }}
          onLogin={() => setShowLoginModal(true)}
          loading={authLoading}
        />
        <LoginModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  // STEP 22: True edge-to-edge full screen biometric commitment confirmation
  if (step === 22) {
    return (
      <View style={[styles.screen, { backgroundColor: BLUE_THEME.bgDark }]}>
        <BiometricFingerprintConfirm
          userName={profile.name || t.onboarding.defaultWarriorName}
          onConfirmed={next}
          onBack={back}
          streakGoalDays={profile.streakCommitment || 30}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.screen,
        {
          backgroundColor: BLUE_THEME.bgDark,
          paddingTop: insets.top + 6,
        },
      ]}
    >
      {/* Top Navigation Header with Back Arrow & Pill Progress Indicator */}
      <View style={styles.navHeader}>
        {step > 0 && step !== 19 ? (
          <Pressable
            onPress={back}
            style={styles.backButton}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Feather name="chevron-left" size={24} color={BLUE_THEME.white} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        {step !== 19 ? (
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressRatio * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.stepCounterText}>
              {step + 1}/{TOTAL_STEPS + 1}
            </Text>
          </View>
        ) : null}

        {step !== 19 && step !== 23 ? (
          <Pressable
            onPress={() => handleFinishOnboarding(false)}
            style={styles.skipHeaderBtn}
            hitSlop={10}
          >
            <Text style={styles.skipHeaderText}>{t.onboarding.skip}</Text>
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {/* Main Flow Content */}
      <KeyboardAwareScrollViewCompat
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={step !== 3}
      >
        {/* ================= STEP 1: goal (Primary Fitness Objective) ================= */}
        {step === 1 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.goalTitle}</Text>

            <View style={styles.optionsList}>
              {[
                {
                  id: "Build Muscle",
                  label: t.onboarding.goals["Build Muscle"] || "Gain Muscle",
                  icon: "zap",
                },
                {
                  id: "Burn Fat",
                  label: t.onboarding.goals["Burn Fat"] || "Lose Weight",
                  icon: "flame",
                },
                {
                  id: "Increase Endurance",
                  label:
                    t.onboarding.goals["Increase Endurance"] ||
                    "Build Strength",
                  icon: "shield",
                },
                {
                  id: "Weight Loss",
                  label: t.onboarding.goals["Weight Loss"] || "Lose Weight",
                  icon: "award",
                },
                {
                  id: "Optimize Workouts",
                  label:
                    t.onboarding.goals["Optimize Workouts"] || "Stay Consistent",
                  icon: "clock",
                },
              ].map((g) => {
                const selected = profile.goal === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, goal: g.id as PrimaryGoal });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected
                          ? "#172236"
                          : BLUE_THEME.cardDark,
                        borderColor: selected
                          ? BLUE_THEME.primary
                          : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: selected
                              ? "rgba(56, 189, 248, 0.18)"
                              : "#192334",
                          },
                        ]}
                      >
                        <Feather
                          name={g.icon as any}
                          size={20}
                          color={selected ? BLUE_THEME.primary : "#94A3B8"}
                        />
                      </View>
                      <Text style={styles.optionLabel}>{g.label}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        selected && styles.radioCircleActive,
                      ]}
                    >
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 2: gender (Biological Identity) ================= */
        step === 2 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.genderTitle}</Text>

            <View style={styles.optionsList}>
              {[
                { id: "Male", label: t.onboarding.genderMale, icon: "user" },
                {
                  id: "Female",
                  label: t.onboarding.genderFemale,
                  icon: "user-check",
                },
              ].map((item) => {
                const selected = profile.gender === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, gender: item.id as Gender });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected
                          ? "#172236"
                          : BLUE_THEME.cardDark,
                        borderColor: selected
                          ? BLUE_THEME.primary
                          : BLUE_THEME.cardBorder,
                        paddingVertical: 18,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: selected
                              ? "rgba(56, 189, 248, 0.18)"
                              : "#192334",
                          },
                        ]}
                      >
                        <Feather
                          name={item.icon as any}
                          size={22}
                          color={selected ? BLUE_THEME.primary : "#94A3B8"}
                        />
                      </View>
                      <Text style={[styles.optionLabel, { fontSize: 18 }]}>
                        {item.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        selected && styles.radioCircleActive,
                      ]}
                    >
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 3: dateOfBirth (3-Column Picker) ================= */
        step === 3 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.dobTitle}</Text>

            <DobWheelPicker
              day={profile.birthDay}
              month={profile.birthMonth}
              year={profile.birthYear}
              onDateChange={handleDobChange}
              dayLabel={t.onboarding.dayLabel}
              monthLabel={t.onboarding.monthLabel}
              yearLabel={t.onboarding.yearLabel}
              locale={locale}
            />
          </View>
        ) : /* ================= STEP 4: units (System of Measurement) ================= */
        step === 4 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.unitTitle}</Text>

            <View style={styles.optionsList}>
              {[
                {
                  id: "Metric",
                  label: t.onboarding.metricLabel,
                  hint: "kg, cm, km",
                },
                {
                  id: "Imperial",
                  label: t.onboarding.imperialLabel,
                  hint: "lbs, in, mi",
                },
              ].map((u) => {
                const selected = profile.unit === u.id;
                return (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, unit: u.id as UnitSystem });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected
                          ? "#172236"
                          : BLUE_THEME.cardDark,
                        borderColor: selected
                          ? BLUE_THEME.primary
                          : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{u.label}</Text>
                      <Text style={styles.subCardText}>{u.hint}</Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        selected && styles.radioCircleActive,
                      ]}
                    >
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : /* ================= STEP 5: weight (Horizontal Ruler Picker) ================= */
        step === 5 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.weightTitle}</Text>

            <HorizontalRulerPicker
              min={profile.unit === "Metric" ? 35 : 77}
              max={profile.unit === "Metric" ? 200 : 440}
              step={profile.unit === "Metric" ? 0.5 : 1}
              fractionDigits={profile.unit === "Metric" ? 1 : 0}
              value={
                profile.weight
                  ? profile.unit === "Metric"
                    ? profile.weight
                    : profile.weight / KG_PER_LB
                  : profile.unit === "Metric"
                    ? 68
                    : 150
              }
              unit={profile.unit === "Metric" ? t.common.kg : t.common.lbs}
              headerTitle={t.onboarding.currentWeight}
              headerIcon="disc"
              presets={
                profile.unit === "Metric"
                  ? [50, 55, 60, 65, 68, 70, 75, 80, 85, 90]
                  : [110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
              }
              onValueChange={(w) =>
                setProfile((p) => ({
                  ...p,
                  weight: profile.unit === "Metric" ? w : w * KG_PER_LB,
                }))
              }
            />
          </View>
        ) : /* ================= STEP 6: height (Horizontal Ruler Picker) ================= */
        step === 6 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <Text style={styles.mainTitle}>{t.onboarding.heightTitle}</Text>

            <HorizontalRulerPicker
              min={profile.unit === "Metric" ? 100 : 39}
              max={profile.unit === "Metric" ? 230 : 90}
              step={1}
              fractionDigits={0}
              value={
                profile.height
                  ? profile.unit === "Metric"
                    ? profile.height
                    : profile.height / CM_PER_IN
                  : profile.unit === "Metric"
                    ? 170
                    : 67
              }
              unit={profile.unit === "Metric" ? "cm" : "in"}
              headerTitle={t.onboarding.currentHeight}
              headerIcon="activity"
              presets={
                profile.unit === "Metric"
                  ? [155, 160, 165, 170, 175, 180, 185, 190]
                  : [61, 63, 65, 67, 69, 71, 73, 75]
              }
              onValueChange={(h) =>
                setProfile((p) => ({
                  ...p,
                  height: profile.unit === "Metric" ? h : h * CM_PER_IN,
                }))
              }
            />
          </View>
        ) : /* ================= STEP 7: fitnessLevel (PR Assessment Intro) ================= */
        step === 7 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="award" size={13} color="#F59E0B" />
              <Text
                style={[styles.motivationalBadgeText, { color: "#FBBF24" }]}
              >
                PR CALIBRATION
              </Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: "center" }]}>
              {t.onboarding.fitnessLevelTitle}
            </Text>

            <View style={styles.prIntroCard}>
              <View style={styles.trophyHeroBox}>
                <View style={styles.trophyGlowAura} />
                <TrophyHeroSvg size={110} />
              </View>

              <View style={styles.prBenchmarkList}>
                <View style={styles.prBenchmarkRow}>
                  <View
                    style={[
                      styles.prBenchmarkIcon,
                      { backgroundColor: "rgba(56, 189, 248, 0.15)" },
                    ]}
                  >
                    <Feather name="zap" size={16} color={BLUE_THEME.primary} />
                  </View>
                  <Text style={styles.prBenchmarkText}>
                    Bench Press (Upper Body Push)
                  </Text>
                </View>
                <View style={styles.prBenchmarkRow}>
                  <View
                    style={[
                      styles.prBenchmarkIcon,
                      { backgroundColor: "rgba(34, 197, 94, 0.15)" },
                    ]}
                  >
                    <Feather name="trending-up" size={16} color="#22C55E" />
                  </View>
                  <Text style={styles.prBenchmarkText}>
                    Barbell Squat (Lower Body Power)
                  </Text>
                </View>
                <View style={styles.prBenchmarkRow}>
                  <View
                    style={[
                      styles.prBenchmarkIcon,
                      { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                    ]}
                  >
                    <Feather name="shield" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.prBenchmarkText}>
                    Deadlift (Full Body Strength)
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.subTitle,
                  {
                    textAlign: "center",
                    fontSize: 12,
                    marginTop: 12,
                    marginBottom: 0,
                  },
                ]}
              >
                {t.onboarding.prHelpText}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 8: benchPressPR ================= */
        step === 8 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>
                BIG 3 BENCHMARK (1/3)
              </Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: "center" }]}>
              {t.onboarding.benchPrTitle}
            </Text>

            <BenchmarkInput
              value={profile.benchPressPR ?? 0}
              maxKg={250}
              unit={profile.unit}
              presets={[40, 50, 60, 70, 80, 100]}
              onChange={(kg) => setProfile((p) => ({ ...p, benchPressPR: kg }))}
              onValidityChange={(valid) =>
                setPrValidity((p) => (p[8] === valid ? p : { ...p, 8: valid }))
              }
            />
          </View>
        ) : /* ================= STEP 9: squatPR ================= */
        step === 9 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>
                BIG 3 BENCHMARK (2/3)
              </Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: "center" }]}>
              {t.onboarding.prSquatTitle}
            </Text>

            <BenchmarkInput
              value={profile.prSquat ?? 0}
              maxKg={300}
              unit={profile.unit}
              presets={[50, 60, 80, 100, 120, 140]}
              onChange={(kg) => setProfile((p) => ({ ...p, prSquat: kg }))}
              onValidityChange={(valid) =>
                setPrValidity((p) => (p[9] === valid ? p : { ...p, 9: valid }))
              }
            />
          </View>
        ) : /* ================= STEP 10: deadliftPR ================= */
        step === 10 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="activity" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>
                BIG 3 BENCHMARK (3/3)
              </Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: "center" }]}>
              {t.onboarding.deadliftPrTitle}
            </Text>

            <BenchmarkInput
              value={profile.deadliftPR ?? 0}
              maxKg={350}
              unit={profile.unit}
              presets={[60, 80, 100, 120, 140, 180]}
              onChange={(kg) => setProfile((p) => ({ ...p, deadliftPR: kg }))}
              onValidityChange={(valid) =>
                setPrValidity((p) =>
                  p[10] === valid ? p : { ...p, 10: valid },
                )
              }
            />
          </View>
        ) : /* ================= STEP 11: trophyUnlock (DYNAMIC CELEBRATION) ================= */
        step === 11 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="award" size={13} color="#F59E0B" />
              <Text
                style={[styles.motivationalBadgeText, { color: "#FBBF24" }]}
              >
                {t.onboarding.trophyUnlockedTag}
              </Text>
            </View>

            <Text style={[styles.welcomeTitle, { textAlign: "center" }]}>
              {t.onboarding.trophyUnlockedTitle}
            </Text>

            <View style={styles.trophyHeroBox}>
              <View style={styles.trophyGlowAura} />
              <TrophyHeroSvg size={140} />
            </View>

            <View style={styles.trophyTierBadgesRow}>
              <View style={styles.trophyTierBadge}>
                <Feather name="shield" size={13} color="#F59E0B" />
                <Text style={styles.trophyTierBadgeText}>
                  {gamification.unlockedTrophies[0]?.tier.toUpperCase() ||
                    "BRONZE"}{" "}
                  TIER MILESTONE
                </Text>
              </View>
              <View
                style={[
                  styles.trophyTierBadge,
                  { backgroundColor: "#0C2038", borderColor: "#1E3A5F" },
                ]}
              >
                <Feather name="zap" size={13} color="#38BDF8" />
                <Text
                  style={[styles.trophyTierBadgeText, { color: "#38BDF8" }]}
                >
                  +{gamification.totalExp} EXP EARNED
                </Text>
              </View>
            </View>

            <View style={styles.trophyCardDesc}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="award" size={18} color={BLUE_THEME.gold} />
                  <Text style={styles.trophyName}>
                    {gamification.unlockedTrophies[0]?.name ||
                      "Power Bench Milestone"}
                  </Text>
                </View>
                <View style={styles.activatedTag}>
                  <Text style={styles.activatedTagText}>
                    {t.onboarding.trophyActivatedBadge}
                  </Text>
                </View>
              </View>
              <Text style={styles.trophySub}>
                {gamification.unlockedTrophies[0]?.description ||
                  `Hit ${profile.benchPressPR || 60}kg Bench Press benchmark.`}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 12: levelJourney (RPG Level Progression) ================= */
        step === 12 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="zap" size={13} color={BLUE_THEME.primary} />
              <Text style={styles.motivationalBadgeText}>LEVEL UP</Text>
            </View>

            <Text style={[styles.mainTitle, { textAlign: "center" }]}>
              {t.onboarding.levelJourneyTitle}
            </Text>

            <View style={styles.levelRoadmapCard}>
              <View style={styles.levelJumpBadgeRow}>
                <View style={styles.levelJumpPill}>
                  <Text style={styles.levelJumpPillText}>LEVEL 1</Text>
                </View>
                <Feather
                  name="arrow-right"
                  size={20}
                  color={BLUE_THEME.primary}
                />
                <View
                  style={[
                    styles.levelJumpPill,
                    { backgroundColor: BLUE_THEME.primary },
                  ]}
                >
                  <Text
                    style={[styles.levelJumpPillText, { color: "#090D16" }]}
                  >
                    LEVEL {gamification.endLevel}
                  </Text>
                </View>
              </View>

              <View style={styles.levelExpReadout}>
                <Text style={styles.levelExpVal}>
                  {gamification.totalExp} EXP
                </Text>
                <Text style={styles.levelExpSub}>
                  Total accumulated starting experience
                </Text>
              </View>

              <View style={styles.levelProgressTrack}>
                <View
                  style={[
                    styles.levelProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        (gamification.xpProgressInLevel /
                          gamification.xpNeededForNext) *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.levelNextThreshold}>
                {gamification.xpProgressInLevel} /{" "}
                {gamification.xpNeededForNext} EXP to Level{" "}
                {gamification.endLevel + 1}
              </Text>

              {/* Milestones Road */}
              <View style={styles.roadmapMilestonesList}>
                <View style={styles.milestoneItem}>
                  <View
                    style={[
                      styles.milestoneDot,
                      { backgroundColor: BLUE_THEME.primary },
                    ]}
                  />
                  <Text
                    style={[styles.milestoneText, { color: BLUE_THEME.white }]}
                  >
                    Level 1: Novice Lifter
                  </Text>
                </View>
                <View style={styles.milestoneItem}>
                  <View
                    style={[
                      styles.milestoneDot,
                      {
                        backgroundColor:
                          gamification.endLevel >= 2
                            ? BLUE_THEME.primary
                            : "#334155",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.milestoneText,
                      gamification.endLevel >= 2 && {
                        color: BLUE_THEME.white,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    Level 2: Disciplined Athlete (+1,000 XP)
                  </Text>
                </View>
                <View style={styles.milestoneItem}>
                  <View
                    style={[
                      styles.milestoneDot,
                      { backgroundColor: "#334155" },
                    ]}
                  />
                  <Text style={styles.milestoneText}>
                    Level 5: Iron Warrior (+5,000 XP)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 13: targetMuscles (Dual Mannequin Stage) ================= */
        step === 13 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.focusAreasTitle}</Text>

            <DualMannequinFocusPicker
              selectedAreas={profile.targetMuscles}
              onToggleArea={toggleFocusArea}
              accentColor={BLUE_THEME.primary}
            />
          </View>
        ) : /* ================= STEP 14: equipment (Equipment Checklist with SVGs) ================= */
        step === 14 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.equipmentTitle}</Text>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              {t.onboarding.trainingExpTitle}
            </Text>
            <View style={styles.optionsList}>
              {(
                [
                  "No experience",
                  "Less than 1 year ago",
                  "Regularly",
                ] as Experience[]
              ).map((value) => {
                const isSelected = profile.experience === value;
                return (
                  <Pressable
                    key={value}
                    style={[
                      styles.optionCard,
                      isSelected && {
                        borderColor: BLUE_THEME.primary,
                        backgroundColor: "#13253A",
                      },
                    ]}
                    onPress={() =>
                      setProfile((p) => ({ ...p, experience: value }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color: "#FFFFFF" },
                      ]}
                    >
                      {t.onboarding.experience[value]?.label || value}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
              {t.onboarding.sessionDurationTitle}
            </Text>
            <View style={styles.optionsList}>
              {[30, 45, 60, 90].map((minutes) => {
                const isSelected = profile.workoutDuration.startsWith(
                  String(minutes),
                );
                return (
                  <Pressable
                    key={minutes}
                    style={[
                      styles.optionCard,
                      isSelected && {
                        borderColor: BLUE_THEME.primary,
                        backgroundColor: "#13253A",
                      },
                    ]}
                    onPress={() =>
                      setProfile((p) => ({
                        ...p,
                        workoutDuration: `${minutes} minutes`,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color: "#FFFFFF" },
                      ]}
                    >
                      {minutes} {t.onboarding.minutesUnit}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
              {t.onboarding.sensitiveJointsTitle}
            </Text>
            <View style={styles.optionsList}>
              {["Knees", "Back", "Shoulders"].map((joint) => {
                const isSelected = profile.sensitiveJoints.includes(joint);
                return (
                  <Pressable
                    key={joint}
                    style={[
                      styles.optionCard,
                      isSelected && {
                        borderColor: BLUE_THEME.primary,
                        backgroundColor: "#13253A",
                      },
                    ]}
                    onPress={() =>
                      setProfile((p) => ({
                        ...p,
                        sensitiveJoints: p.sensitiveJoints.includes(joint)
                          ? p.sensitiveJoints.filter((j) => j !== joint)
                          : [...p.sensitiveJoints, joint],
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color: "#FFFFFF" },
                      ]}
                    >
                      {t.onboarding.sensitiveJointNames[joint] || joint}
                    </Text>
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {EQUIPMENT_CATEGORIES.map((cat) => (
              <View key={cat.category} style={styles.equipmentCatWrap}>
                <Text style={styles.catTitle}>
                  {cat.category.toUpperCase()}
                </Text>
                <View style={styles.optionsList}>
                  {cat.items.map((eq) => {
                    const selected = profile.equipment.includes(eq);
                    return (
                      <Pressable
                        key={eq}
                        onPress={() => toggleEquipment(eq)}
                        style={[
                          styles.optionCard,
                          {
                            backgroundColor: selected
                              ? "#172236"
                              : BLUE_THEME.cardDark,
                            borderColor: selected
                              ? BLUE_THEME.primary
                              : BLUE_THEME.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View style={styles.eqIconTile}>
                            <EquipmentSvg name={eq} />
                          </View>
                          <Text style={styles.optionLabel}>
                            {t.onboarding.equipmentItems[eq] || eq}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkSquare,
                            selected && {
                              backgroundColor: BLUE_THEME.primary,
                              borderColor: BLUE_THEME.primary,
                            },
                          ]}
                        >
                          {selected && (
                            <Feather name="check" size={14} color="#090D16" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : /* ================= STEP 15: streak (Streak Concept & Flame) ================= */
        step === 15 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.motivationalBadge}>
              <Feather name="zap" size={13} color="#F97316" />
              <Text
                style={[styles.motivationalBadgeText, { color: "#F97316" }]}
              >
                {t.onboarding.disciplineStreakBadge}
              </Text>
            </View>

            <View style={styles.flameHeroBox}>
              <View style={styles.flameGlowAura} />
              <FlameHeroSvg />
            </View>

            <Text style={styles.welcomeTitle}>
              {t.onboarding.streakStartTitle}{" "}
              <Text style={{ color: "#F97316" }}>
                {t.onboarding.streakStartHighlight}
              </Text>
            </Text>

            <View style={styles.xpBonusCard}>
              <Feather name="zap" size={18} color="#F59E0B" />
              <Text style={styles.xpBonusCardText}>
                {t.onboarding.streakXpBonusText}
              </Text>
            </View>

            <View style={styles.streakWeekBox}>
              <View style={styles.streakDaysRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.streakDayCircle,
                      idx === 1 && { backgroundColor: "#F97316" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.streakDayText,
                        idx === 1 && { color: "#FFFFFF", fontWeight: "800" },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.streakHint}>{t.onboarding.streakHint}</Text>
            </View>
          </View>
        ) : /* ================= STEP 16: streakCommitment (4-Tier Retention Multipliers) ================= */
        step === 16 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>
              {t.onboarding.commitWorkoutTitle}
            </Text>

            <View style={styles.optionsList}>
              {STREAK_COMMITMENT_OPTIONS.map((item) => {
                const selected = profile.streakCommitment === item.days;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setProfile({ ...profile, streakCommitment: item.days });
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: selected
                          ? "#172236"
                          : BLUE_THEME.cardDark,
                        borderColor: selected
                          ? BLUE_THEME.primary
                          : BLUE_THEME.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <Feather
                        name="zap"
                        size={18}
                        color={selected ? BLUE_THEME.primary : "#94A3B8"}
                      />
                      <View>
                        <Text style={styles.optionLabel}>{item.label}</Text>
                        <Text style={styles.subCardText}>
                          {item.secondaryText}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.multiplierBadge,
                        selected && { backgroundColor: BLUE_THEME.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.multiplierBadgeText,
                          selected
                            ? { color: "#090D16" }
                            : { color: BLUE_THEME.primary },
                        ]}
                      >
                        {item.multiplier}x
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

          </View>
        ) : /* ================= STEP 17: notificationPermission ================= */
        step === 17 ? (
          <View style={[styles.stepContainer, styles.centerFlex]}>
            <View style={styles.notifGraphicBox}>
              <View style={styles.trophyGlowAura} />
              <Feather name="bell" size={56} color={BLUE_THEME.primary} />
            </View>

            <Text
              style={[styles.mainTitle, { textAlign: "center", marginTop: 18 }]}
            >
              {t.onboarding.notifPermissionTitle}
            </Text>

            <View style={styles.notificationPreviewCard}>
              <Feather name="clock" size={20} color={BLUE_THEME.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>
                  {t.onboarding.notifStreakTitle}
                </Text>
                <Text style={styles.notifBody}>
                  {t.onboarding.notifStreakBody}
                </Text>
              </View>
            </View>
          </View>
        ) : /* ================= STEP 18: referralSource (Acquisition Channel) ================= */
        step === 18 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>{t.onboarding.referralTitle}</Text>
            <View style={styles.optionsList}>
              {Object.entries(t.onboarding.referralOptions).map(
                ([key, label]) => {
                  const selected = profile.referralSource === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setProfile({ ...profile, referralSource: key });
                      }}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: selected
                            ? "#172236"
                            : BLUE_THEME.cardDark,
                          borderColor: selected
                            ? BLUE_THEME.primary
                            : BLUE_THEME.cardBorder,
                        },
                      ]}
                    >
                      <Text style={styles.optionLabel}>{label}</Text>
                      <View
                        style={[
                          styles.radioCircle,
                          selected && styles.radioCircleActive,
                        ]}
                      >
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>
        ) : /* ================= STEP 19: routinePrep (Animated Routine Generator) ================= */
        step === 19 ? (
          <View
            style={[
              styles.stepContainer,
              styles.centerFlex,
              { paddingVertical: 40 },
            ]}
          >
            <View style={styles.loadingAuraBox}>
              <View style={styles.loadingRingOuter}>
                <Svg width="150" height="150" viewBox="0 0 100 100">
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="8"
                  />
                  <Circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={BLUE_THEME.primary}
                    strokeWidth="8"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * routinePrepProgress) / 100}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </Svg>
                <View style={styles.loadingInsideText}>
                  <Text style={styles.loadingProgressNumber}>
                    {routinePrepProgress}%
                  </Text>
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.welcomeTitle,
                { fontSize: 26, marginTop: 24, textAlign: "center" },
              ]}
            >
              {t.onboarding.preparingRoutine}
            </Text>
            <View style={styles.loadingStatusTag}>
              <Feather name="cpu" size={14} color="#38BDF8" />
              <Text style={styles.loadingStatusText}>
                {routinePrepProgress < 40
                  ? t.onboarding.analyzingMuscles
                  : routinePrepProgress < 85
                    ? t.onboarding.calculatingOverload
                    : t.onboarding.finalizingPlan}
              </Text>
            </View>
          </View>
        ) : /* ================= STEP 20: routineReview (Generated Routine Review) ================= */
        step === 20 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderBadge}>
              <Feather
                name="check-circle"
                size={13}
                color={BLUE_THEME.primary}
              />
              <Text style={styles.stepBadgeText}>ROUTINE READY</Text>
            </View>

            <Text style={styles.mainTitle}>
              {t.onboarding.routineOverviewTitle}
            </Text>
            <View style={styles.optionsList}>
              {routinePreview.map((routine, index) => (
                <View key={routine.id} style={styles.optionCard}>
                  <View style={styles.routineDayIcon}>
                    <Feather
                      name="activity"
                      size={18}
                      color={BLUE_THEME.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{routine.name}</Text>
                    <Text style={styles.subCardText}>
                      {t.onboarding.exercisesCount.replace(
                        "{count}",
                        String(routine.exercises.length),
                      )}
                    </Text>
                  </View>
                  <View style={styles.routineDayTag}>
                    <Text style={styles.routineDayTagText}>
                      {t.onboarding.dayLetterFmt.replace(
                        "{letter}",
                        String.fromCharCode(65 + index),
                      )}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : /* ================= STEP 21: profileName (Display Name) ================= */
        step === 21 ? (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderBadge}>
              <Feather
                name="user-check"
                size={13}
                color={BLUE_THEME.primary}
              />
              <Text style={styles.stepBadgeText}>PROFILE IDENTITY</Text>
            </View>

            <Text style={styles.mainTitle}>
              {t.onboarding.yourProfileTitle}
            </Text>

            {/* Profile Avatar Badge */}
            <View style={styles.profileAvatarHero}>
              <ExpoLinearGradient
                colors={["#0F253E", "#151D2D"]}
                style={styles.profileAvatarCircle}
              >
                <Feather name="shield" size={36} color="#38BDF8" />
              </ExpoLinearGradient>
              <Text style={styles.profileHeroCaption}>
                {profile.name?.trim() || t.onboarding.defaultWarriorName}
              </Text>
            </View>

            {/* Name Input */}
            <Text style={styles.fieldLabel}>{t.onboarding.nameTitle}</Text>
            <TextInput
              style={styles.inputField}
              value={profile.name}
              placeholder="e.g. Linh"
              placeholderTextColor="#64748B"
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              maxLength={60}
              returnKeyType="next"
            />
            <Text style={[styles.subCardText, { marginTop: 6, marginBottom: 14 }]}>
              {t.onboarding.nameNotice}
            </Text>

          </View>
        ) : /* ================= STEP 23: loginStep (Sign In / Account Connection) ================= */
        step === 23 ? (
          <View style={styles.stepContainer}>
            <Text style={styles.mainTitle}>
              {t.onboarding.signInTitle}
            </Text>

            {/* Account Input 1: Username / Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {t.onboarding.usernameOrEmail}
              </Text>
              <View style={styles.inputContainer}>
                <Feather
                  name="user"
                  size={18}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.loginTextInput}
                  value={loginIdentifier}
                  onChangeText={setLoginIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  editable={!authLoading}
                />
              </View>
            </View>

            {/* Account Input 2: Password */}
            <View style={[styles.fieldGroup, { marginTop: 12 }]}>
              <Text style={styles.fieldLabel}>
                {t.onboarding.passwordLabel}
              </Text>
              <View style={styles.inputContainer}>
                <Feather
                  name="lock"
                  size={18}
                  color="#64748B"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.loginTextInput}
                  value={loginPasswordInput}
                  onChangeText={setLoginPasswordInput}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                  editable={!authLoading}
                />
                <Pressable
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  hitSlop={10}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showLoginPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Password Login Button */}
            <Pressable
              onPress={handlePasswordLogin}
              disabled={authLoading}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.btnPressed,
                authLoading && styles.btnDisabled,
              ]}
            >
              <ExpoLinearGradient
                colors={["#38BDF8", "#0284C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtnGradient}
              >
                {loginSubmitting ? (
                  <ActivityIndicator size="small" color="#04121F" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {t.onboarding.signInBtn}
                    </Text>
                    <Feather name="arrow-right" size={18} color="#04121F" />
                  </>
                )}
              </ExpoLinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {t.onboarding.orContinueWith}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 2 Big Social Login Cards */}
            <View style={{ gap: 12 }}>
              {/* Google Big Card */}
              <Pressable
                disabled={authLoading}
                onPress={() => void handleExistingAccountLogin("google")}
                style={({ pressed }) => [
                  styles.socialAuthBtnLarge,
                  styles.googleAuthCard,
                  pressed && styles.btnPressed,
                  authLoading && styles.btnDisabled,
                ]}
              >
                <View style={styles.socialIconBox}>
                  <GoogleLogo size={22} />
                </View>
                <Text style={styles.socialAuthLargeText}>
                  {t.onboarding.continueWithGoogle}
                </Text>
              </Pressable>

              {/* Apple Big Card */}
              {Platform.OS === "ios" && (
                <Pressable
                  disabled={authLoading}
                  onPress={() => void handleExistingAccountLogin("apple")}
                  style={({ pressed }) => [
                    styles.socialAuthBtnLarge,
                    styles.appleAuthCard,
                    pressed && styles.btnPressed,
                    authLoading && styles.btnDisabled,
                  ]}
                >
                  <View style={styles.socialIconBox}>
                    <FontAwesome name="apple" size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.socialAuthLargeText}>
                    {t.onboarding.continueWithApple}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : /* ================= STEP 24: youAreReady (Celebration & Soft Paywall CTA) ================= */
        step === 24 ? (
          <View
            style={[
              styles.stepContainer,
              styles.centerFlex,
              { paddingVertical: 30 },
            ]}
          >
            <View style={styles.celebrationIconBox}>
              <Svg width="100" height="100" viewBox="0 0 100 100">
                <Defs>
                  <LinearGradient
                    id="readyGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor="#38BDF8" />
                    <Stop offset="100%" stopColor="#22C55E" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="url(#readyGrad)"
                  strokeWidth="4"
                />
                <Path
                  d="M 30,52 L 44,66 L 72,36"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <Text
              style={[styles.welcomeTitle, { fontSize: 30, marginTop: 20 }]}
            >
              {t.onboarding.youAreReady}
            </Text>

            <View style={styles.readySummaryCard}>
              <View style={styles.readySummaryItem}>
                <View
                  style={[styles.readyDot, { backgroundColor: "#38BDF8" }]}
                />
                <Text style={styles.readySummaryText}>
                  {t.onboarding.readyRoutineGenerated}
                </Text>
              </View>
              <View style={styles.readySummaryItem}>
                <View
                  style={[styles.readyDot, { backgroundColor: "#F97316" }]}
                />
                <Text style={styles.readySummaryText}>
                  {t.onboarding.readyStreakPledged.replace(
                    "{days}",
                    String(profile.streakCommitment || 30),
                  )}
                </Text>
              </View>
              <View style={styles.readySummaryItem}>
                <View
                  style={[styles.readyDot, { backgroundColor: "#A855F7" }]}
                />
                <Text style={styles.readySummaryText}>
                  {t.onboarding.readyRanksArmed}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      {/* Sticky Bottom Action Bar */}
      {step !== 19 && step !== 23 ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            onPress={next}
            disabled={authLoading}
            style={({ pressed }) => [
              styles.continueBtn,
              {
                backgroundColor: BLUE_THEME.primary,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.continueBtnText}>{buttonText}</Text>
          </Pressable>

          {step === 17 ? (
            <Pressable
              disabled={authLoading}
              onPress={() => {
                if (authLock.current) return;
                authLock.current = true;
                setAuthLoading(true);
                setProfile((p) => ({ ...p, notificationsEnabled: false }));
                void cancelWorkoutReminders()
                  .catch(() => undefined)
                  .finally(() => {
                    authLock.current = false;
                    setAuthLoading(false);
                    setStep(18);
                  });
              }}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text style={styles.loginHint}>{t.onboarding.maybeLater}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        allowDownsell
        onClose={() => handleFinishOnboarding(false)}
        onSubscribe={(_plan) => handleFinishOnboarding(true)}
        onSuccess={() => handleFinishOnboarding(true)}
      />

      {/* Tester & Existing Account Login Modal */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    flex: 1,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171F30",
  },
  backPlaceholder: {
    width: 36,
  },
  skipHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#162032",
  },
  skipHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  progressBarWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: BLUE_THEME.primary,
    borderRadius: 3,
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: "700",
    color: BLUE_THEME.primary,
    minWidth: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepContainer: {
    width: "100%",
  },
  centerFlex: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "900",
    color: BLUE_THEME.white,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: BLUE_THEME.subText,
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  optionCard: {
    width: "100%",
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    backgroundColor: BLUE_THEME.cardDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: BLUE_THEME.white,
    flex: 1,
  },
  subCardText: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#334155",
  },
  radioCircleActive: {
    borderColor: BLUE_THEME.primary,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE_THEME.primary,
  },
  checkSquare: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#334155",
    backgroundColor: "#182030",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "center",
    gap: 8,
    backgroundColor: BLUE_THEME.bgDark,
  },
  continueBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE_THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#070B14",
    letterSpacing: 0.4,
  },
  loginHint: {
    fontSize: 13,
    color: BLUE_THEME.subText,
  },
  stepHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  stepBadgeText: {
    color: BLUE_THEME.primary,
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  motivationalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  motivationalBadgeText: {
    color: BLUE_THEME.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  prIntroCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  prBenchmarkList: {
    width: "100%",
    gap: 12,
    marginTop: 14,
  },
  prBenchmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prBenchmarkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  prBenchmarkText: {
    fontSize: 14,
    fontWeight: "700",
    color: BLUE_THEME.white,
  },
  rulerValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginVertical: 20,
  },
  adjustStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#162032",
    borderWidth: 1.5,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  rulerInputBox: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#131B2A",
    borderWidth: 1.5,
    borderColor: "#223049",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 6,
  },
  rulerLargeValInput: {
    fontSize: 44,
    fontWeight: "900",
    color: BLUE_THEME.white,
    minWidth: 80,
    textAlign: "center",
    padding: 0,
  },
  rulerUnit: {
    fontSize: 18,
    fontWeight: "700",
    color: BLUE_THEME.subText,
  },
  rulerPresetsWrap: {
    width: "100%",
    marginVertical: 12,
  },
  rulerMarksScroll: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rulerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#141D2E",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  rulerChipActive: {
    backgroundColor: "#172B45",
    borderColor: BLUE_THEME.primary,
  },
  rulerChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
  rulerChipTextActive: {
    color: BLUE_THEME.white,
    fontWeight: "800",
  },
  trophyHeroBox: {
    marginVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  trophyGlowAura: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  trophyTierBadgesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  trophyTierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#261C08",
    borderColor: "#78350F",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  trophyTierBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
  },
  trophyCardDesc: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: "100%",
  },
  trophyName: {
    fontSize: 16,
    fontWeight: "800",
    color: BLUE_THEME.white,
  },
  activatedTag: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  activatedTagText: {
    color: "#22C55E",
    fontSize: 10.5,
    fontWeight: "800",
  },
  trophySub: {
    fontSize: 13,
    color: BLUE_THEME.subText,
    lineHeight: 18,
  },
  levelRoadmapCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  levelJumpBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  levelJumpPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  levelJumpPillText: {
    fontSize: 14,
    fontWeight: "900",
    color: BLUE_THEME.white,
  },
  levelExpReadout: {
    alignItems: "center",
    marginBottom: 16,
  },
  levelExpVal: {
    fontSize: 32,
    fontWeight: "900",
    color: BLUE_THEME.primary,
  },
  levelExpSub: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  levelProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  levelProgressFill: {
    height: "100%",
    backgroundColor: BLUE_THEME.primary,
    borderRadius: 4,
  },
  levelNextThreshold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 6,
  },
  roadmapMilestonesList: {
    width: "100%",
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#202A3C",
    paddingTop: 16,
  },
  milestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  milestoneText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  equipmentCatWrap: {
    marginTop: 18,
    width: "100%",
  },
  catTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BLUE_THEME.white,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  eqIconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#171E2D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#242F44",
  },
  flameHeroBox: {
    marginVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  flameGlowAura: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(249, 115, 22, 0.2)",
  },
  xpBonusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#261C08",
    borderColor: "#78350F",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 10,
  },
  xpBonusCardText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FBBF24",
  },
  streakWeekBox: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: "100%",
    alignItems: "center",
    marginVertical: 16,
  },
  streakDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  streakDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1A2333",
    alignItems: "center",
    justifyContent: "center",
  },
  streakDayText: {
    fontSize: 13,
    color: BLUE_THEME.subText,
  },
  streakHint: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    textAlign: "center",
  },
  multiplierBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  multiplierBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },
  notifGraphicBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#172236",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  notificationPreviewCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 16,
    alignItems: "center",
    marginTop: 18,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BLUE_THEME.white,
  },
  notifBody: {
    fontSize: 12,
    color: BLUE_THEME.subText,
    marginTop: 2,
  },
  starsInteractiveRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 24,
  },
  starPressable: {
    padding: 4,
  },
  testimonialCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 20,
    width: "100%",
    marginTop: 10,
  },
  starsText: {
    fontSize: 16,
    color: "#F59E0B",
    marginBottom: 6,
  },
  quoteTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BLUE_THEME.white,
    marginBottom: 4,
  },
  quoteBody: {
    fontSize: 13,
    color: BLUE_THEME.subText,
    lineHeight: 18,
  },
  authorText: {
    fontSize: 12,
    fontWeight: "700",
    color: BLUE_THEME.primary,
    marginTop: 8,
  },
  loadingAuraBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  loadingRingOuter: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  loadingInsideText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingProgressNumber: {
    fontSize: 32,
    fontWeight: "900",
    color: BLUE_THEME.white,
  },
  loadingStatusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  loadingStatusText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#38BDF8",
  },
  routineDayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#162338",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routineDayTag: {
    backgroundColor: "#1E2C44",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  routineDayTagText: {
    fontSize: 11,
    color: BLUE_THEME.primary,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#CBD5E1",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputField: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE_THEME.cardDark,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: BLUE_THEME.white,
  },
  profileAvatarHero: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  profileAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.4)",
    marginBottom: 8,
  },
  profileHeroCaption: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  fieldGroup: {
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderWidth: 1.5,
    borderColor: "#1E293B",
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  loginTextInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 14,
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  submitBtnText: {
    color: "#04121F",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E293B",
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  socialAuthBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  googleAuthCard: {
    backgroundColor: "#151D2D",
    borderColor: "#27354D",
  },
  appleAuthCard: {
    backgroundColor: "#000000",
    borderColor: "#27354D",
  },
  socialIconBox: {
    marginRight: 12,
  },
  socialAuthLargeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
  celebrationIconBox: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  readySummaryCard: {
    backgroundColor: BLUE_THEME.cardDark,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BLUE_THEME.cardBorder,
    padding: 18,
    width: "100%",
    gap: 14,
    marginTop: 20,
  },
  readySummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  readySummaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: BLUE_THEME.white,
    flex: 1,
  },
});
