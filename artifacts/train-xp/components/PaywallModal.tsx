import { Text } from "@/components/AppTypography";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/context/AppState";
import { useI18n } from "@/lib/i18n";
import {
  fetchOfferings,
  initPurchases,
  type PackageDisplay,
  PRIVACY_POLICY_URL,
  purchaseSubscription,
  restoreSubscription,
  TERMS_OF_USE_URL,
} from "@/lib/purchases";

const BLUE_ACCENT = "#38BDF8";
const DARK_BG = "#070B14";
const CARD_BG = "#0E1726";
const CARD_SELECTED_BG = "#11233E";
const BORDER_COLOR = "#1E293B";
const TEXT_MUTED = "#94A3B8";

interface PaywallModalProps {
  visible?: boolean;
  onClose: () => void;
  onSubscribe?: (plan: "annual" | "monthly" | "weekly") => void;
  onSuccess?: () => void;
  allowDownsell?: boolean;
}

export function PaywallModal({
  visible = true,
  onClose,
  onSubscribe,
  onSuccess,
  allowDownsell = false,
}: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const { setProStatus, profile } = useAppState();
  const { t, locale } = useI18n();

  const { width, height } = useWindowDimensions();
  const operationLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [offerStatus, setOfferStatus] = useState<
    "loading" | "ready" | "error" | "unavailable"
  >("loading");
  const [offerRetry, setOfferRetry] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<
    "annual" | "monthly" | "weekly"
  >("annual");
  const [canClose, setCanClose] = useState(false);
  const [hasShownDownsell, setHasShownDownsell] = useState(false);
  const [showDownsellModal, setShowDownsellModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<{
    annual: PackageDisplay;
    annualDiscount?: PackageDisplay;
    monthly: PackageDisplay;
    weekly: PackageDisplay;
  } | null>(null);

  // Soft delay for close button (1.5 seconds)
  useEffect(() => {
    if (!visible) return;
    setCanClose(false);
    setHasShownDownsell(false);
    setShowDownsellModal(false);
    const timer = setTimeout(() => setCanClose(true), 1500);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setOfferStatus("loading");
    setOfferings(null);
    void (async () => {
      await initPurchases(profile.authUserId);
      const data = await fetchOfferings();
      if (cancelled) return;
      setOfferings(data);
      const available = (["annual", "monthly", "weekly"] as const).filter(
        (plan) => Boolean(data[plan].rcPackage),
      );
      setOfferStatus(available.length ? "ready" : "unavailable");
      if (available.length) setSelectedPlan(available[0]);
    })().catch(() => {
      if (!cancelled) setOfferStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [visible, offerRetry, profile.authUserId]);

  const handleSelectPlan = (plan: "annual" | "monthly" | "weekly") => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleCloseAttempt = () => {
    if (!canClose || operationLock.current) return;
    if (showDownsellModal) {
      setShowDownsellModal(false);
      onClose();
      return;
    }
    if (allowDownsell && !hasShownDownsell) {
      setHasShownDownsell(true);
      setShowDownsellModal(true);
      return;
    }
    onClose();
  };

  const handleContinue = async (
    plan: "annual" | "monthly" | "weekly" = selectedPlan,
    packageOverride?: PackageDisplay,
  ) => {
    if (operationLock.current) return;
    operationLock.current = true;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const pkg = packageOverride || (offerings ? offerings[plan] : null);
      if (!pkg?.rcPackage) {
        Alert.alert(
          t.paywall.purchaseError,
          t.paywall.plansUnavailableRetry,
        );
        return;
      }
      const isSuccess = await purchaseSubscription(pkg);

      if (isSuccess) {
        setProStatus(true);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        if (onSuccess) onSuccess();
        else onSubscribe?.(plan);
      }
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t.paywall.purchaseError,
        err?.message || t.paywall.purchaseErrorDefault,
      );
    } finally {
      operationLock.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (operationLock.current) return;
    operationLock.current = true;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const restored = await restoreSubscription();
      if (restored) {
        setProStatus(true);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        Alert.alert(t.paywall.restoreSuccess, t.paywall.restoreSuccessDesc, [
          {
            text: "OK",
            onPress: () => {
              if (onSuccess) onSuccess();
              else onSubscribe?.(selectedPlan);
            },
          },
        ]);
      } else {
        Alert.alert(t.paywall.noSubFound, t.paywall.noSubFoundDesc);
      }
    } catch (err: any) {
      Alert.alert(
        t.paywall.restoreFailed,
        err?.message || t.paywall.restoreFailedDesc,
      );
    } finally {
      operationLock.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    void Haptics.selectionAsync();
    void Linking.openURL(url).catch(() =>
      Alert.alert(t.paywall.unableToOpenLink),
    );
  };

  const annualPkg = offerings?.annual;
  const annualDiscountPkg = offerings?.annualDiscount;
  const monthlyPkg = offerings?.monthly;
  const weeklyPkg = offerings?.weekly;

  const isTrialSelected = Boolean(offerings?.[selectedPlan]?.hasTrial);

  const proFeatures = [
    { icon: "list", title: t.paywall.feature1 },
    { icon: "image", title: t.paywall.feature2 },
    { icon: "calendar", title: t.paywall.feature3 },
    { icon: "bar-chart-2", title: t.paywall.feature4 },
  ] as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleCloseAttempt}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 4,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height - insets.top - Math.max(insets.bottom, 6) - 4 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. Top Controls Bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={handleRestore}
              hitSlop={12}
              disabled={loading}
              style={styles.restoreBtn}
            >
              <Text style={styles.restoreText}>
                {t.paywall.restorePurchases}
              </Text>
            </Pressable>

            {canClose ? (
              <Pressable
                onPress={handleCloseAttempt}
                disabled={loading}
                accessibilityLabel={t.paywall.closePaywall}
                hitSlop={14}
                style={styles.closeButton}
              >
                <Feather name="x" size={18} color="#94A3B8" />
              </Pressable>
            ) : (
              <View style={styles.closePlaceholder} />
            )}
          </View>

          {/* 2. Bold Headline / Branding */}
          <View style={styles.headlineSection}>
            <View style={styles.proPillBadge}>
              <Feather name="zap" size={12} color="#070B14" />
              <Text style={styles.proPillText}>TRAINXP PRO</Text>
            </View>
            <Text style={styles.heroTitle}>{t.paywall.heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{t.paywall.heroSubtitle}</Text>
          </View>

          {/* 3. Four core TrainXP Pro benefits */}
          <View style={styles.featureBox}>
            {proFeatures.map((feat, idx) => (
              <View key={idx} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Feather name={feat.icon} size={13} color={BLUE_ACCENT} />
                </View>
                <Text style={styles.featureText} numberOfLines={2}>
                  {feat.title}
                </Text>
              </View>
            ))}
          </View>

          {/* 4. Enlarged & Prominent Pricing Cards (Annual, Monthly, Weekly) */}
          <View style={styles.pricingSection}>
            {offerStatus === "loading" ? (
              <ActivityIndicator color={BLUE_ACCENT} />
            ) : offerStatus !== "ready" ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: TEXT_MUTED, textAlign: "center" }}>
                  {t.paywall.plansUnavailableRetry}
                </Text>
                <Pressable
                  style={styles.restoreBtn}
                  onPress={() => setOfferRetry((n) => n + 1)}
                >
                  <Text style={styles.restoreText}>
                    {t.paywall.retry}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {/* Annual (Best Value) */}
            <Pressable
              disabled={loading || !annualPkg?.rcPackage}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === "annual" }}
              onPress={() => handleSelectPlan("annual")}
              style={[
                styles.planCard,
                selectedPlan === "annual" && styles.planCardSelected,
              ]}
            >
              <View style={styles.badgeTag}>
                <Text style={styles.badgeTagText}>
                  {t.paywall.bestValueBadge}
                </Text>
              </View>

              <View style={styles.planLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    selectedPlan === "annual" && styles.radioCircleActive,
                  ]}
                >
                  {selectedPlan === "annual" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{t.paywall.annualTitle}</Text>
                  <Text style={styles.planSub}>{t.paywall.annualSub}</Text>
                </View>
              </View>

              <View style={styles.planPrice}>
                <Text style={styles.mainPrice}>
                  {annualPkg?.priceString || "—"}
                  <Text style={styles.perUnitText}>{t.paywall.perYear}</Text>
                </Text>
                <Text style={styles.subPrice}>
                  ≈{" "}
                  {annualPkg?.perMonthPrice || "—"}{" "}
                  {t.paywall.perMonth}
                </Text>
              </View>
            </Pressable>

            {/* Monthly (Flexible) */}
            <Pressable
              disabled={loading || !monthlyPkg?.rcPackage}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === "monthly" }}
              onPress={() => handleSelectPlan("monthly")}
              style={[
                styles.planCard,
                selectedPlan === "monthly" && styles.planCardSelected,
              ]}
            >
              <View style={styles.planLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    selectedPlan === "monthly" && styles.radioCircleActive,
                  ]}
                >
                  {selectedPlan === "monthly" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{t.paywall.monthlyTitle}</Text>
                  <Text style={styles.planSub}>{t.paywall.monthlySub}</Text>
                </View>
              </View>

              <View style={styles.planPrice}>
                <Text style={styles.mainPrice}>
                  {monthlyPkg?.priceString || "—"}
                </Text>
                <Text style={styles.subPrice}>{t.paywall.perMonth}</Text>
              </View>
            </Pressable>

            {/* Weekly (Short Term) */}
            <Pressable
              disabled={loading || !weeklyPkg?.rcPackage}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === "weekly" }}
              onPress={() => handleSelectPlan("weekly")}
              style={[
                styles.planCard,
                selectedPlan === "weekly" && styles.planCardSelected,
              ]}
            >
              <View style={styles.planLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    selectedPlan === "weekly" && styles.radioCircleActive,
                  ]}
                >
                  {selectedPlan === "weekly" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>{t.paywall.weeklyTitle}</Text>
                  <Text style={styles.planSub}>{t.paywall.weeklySub}</Text>
                </View>
              </View>

              <View style={styles.planPrice}>
                <Text style={styles.mainPrice}>
                  {weeklyPkg?.priceString || "—"}
                </Text>
                <Text style={styles.subPrice}>{t.paywall.perWeek}</Text>
              </View>
            </Pressable>
          </View>

          {/* 5. Bottom Actions & Disclosures */}
          <View style={styles.ctaSection}>
            <Pressable
              onPress={() => void handleContinue()}
              disabled={loading || !offerings?.[selectedPlan]?.rcPackage}
              style={({ pressed }) => [
                styles.ctaButton,
                {
                  opacity: pressed || loading ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#070B14" />
              ) : (
                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>
                    {isTrialSelected
                      ? t.paywall.startTrialCta
                      : t.paywall.startCta}
                  </Text>
                  <Feather name="arrow-right" size={17} color="#070B14" />
                </View>
              )}
            </Pressable>

            {/* Apple Mandatory Disclosures */}
            <View style={styles.legalSection}>
              <Text style={styles.subscriptionDisclaimer}>
                {t.paywall.autoRenewDisclosure}
              </Text>

              <View style={styles.legalLinksRow}>
                <Pressable
                  onPress={() => handleOpenLink(TERMS_OF_USE_URL)}
                  hitSlop={8}
                >
                  <Text style={styles.legalLinkText}>
                    {t.paywall.termsOfUse}
                  </Text>
                </Pressable>
                <Text style={styles.legalBullet}>•</Text>
                <Pressable
                  onPress={() => handleOpenLink(PRIVACY_POLICY_URL)}
                  hitSlop={8}
                >
                  <Text style={styles.legalLinkText}>
                    {t.paywall.privacyPolicy}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Exit Intent / Downsell Overlay (Non-nested overlay avoids modal dismissal crash) */}
        {showDownsellModal ? (
          <View style={styles.downsellOverlay}>
            <ScrollView
              style={{
                maxHeight: height - insets.top - insets.bottom - 32,
                width: "100%",
              }}
              contentContainerStyle={styles.downsellCard}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.downsellIconCircle}>
                <Feather name="gift" size={26} color={BLUE_ACCENT} />
              </View>

              <Text style={styles.downsellTitle}>
                {t.paywall.downsellTitle}
              </Text>
              <Text style={styles.downsellDesc}>{t.paywall.downsellDesc}</Text>

              <View style={styles.downsellOfferBox}>
                <Text style={styles.downsellOfferBadge}>
                  {annualDiscountPkg
                    ? t.paywall.downsellDiscountBadge
                    : t.paywall.bestValueBadge}
                </Text>
                {annualDiscountPkg ? (
                  <Text style={styles.downsellOfferOldPrice}>
                    {annualPkg?.priceString || "—"} {t.paywall.perYear}
                  </Text>
                ) : null}
                <Text style={styles.downsellOfferPrice}>
                  {annualDiscountPkg?.priceString || annualPkg?.priceString || "—"} {t.paywall.perYear}
                </Text>
                <Text style={styles.downsellOfferSub}>
                  {annualDiscountPkg?.perMonthPrice || annualPkg?.perMonthPrice || "—"} {t.paywall.perMonth}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setShowDownsellModal(false);
                  setSelectedPlan("annual");
                  void handleContinue("annual", annualDiscountPkg);
                }}
                disabled={loading || !(annualDiscountPkg || annualPkg)?.rcPackage}
                style={[
                  styles.downsellCtaBtn,
                  !(annualDiscountPkg || annualPkg)?.rcPackage && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.downsellCtaText}>
                  {annualDiscountPkg
                    ? t.paywall.downsellDiscountCta
                    : t.paywall.downsellCta}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDownsellModal(false);
                  onClose();
                }}
                style={styles.downsellDismissBtn}
              >
                <Text style={styles.downsellDismissText}>
                  {t.paywall.downsellDismiss}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  restoreBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#121927",
  },
  restoreText: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "700",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121927",
  },
  closePlaceholder: {
    width: 28,
    height: 28,
  },
  headlineSection: {
    alignItems: "center",
    marginVertical: 2,
  },
  proPillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    marginBottom: 4,
  },
  proPillText: {
    color: "#070B14",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 15,
  },
  featureBox: {
    backgroundColor: "#0C1322",
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    gap: 5,
    marginVertical: 3,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 11.5,
    color: "#E2E8F0",
    fontWeight: "600",
    flex: 1,
    lineHeight: 15,
  },
  pricingSection: {
    gap: 8,
    marginVertical: 4,
  },
  planCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  planCardSelected: {
    borderColor: BLUE_ACCENT,
    backgroundColor: CARD_SELECTED_BG,
    borderWidth: 2,
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeTag: {
    position: "absolute",
    top: -9,
    right: 14,
    backgroundColor: BLUE_ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  badgeTagText: {
    color: "#070B14",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: BLUE_ACCENT,
    borderWidth: 2,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: BLUE_ACCENT,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  planSub: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  planPrice: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  mainPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  perUnitText: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  subPrice: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  ctaSection: {
    gap: 6,
    marginTop: 4,
  },
  ctaButton: {
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: BLUE_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ctaText: {
    color: "#070B14",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  guaranteeText: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  legalSection: {
    alignItems: "center",
    gap: 2,
  },
  subscriptionDisclaimer: {
    fontSize: 10.5,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 14,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  legalLinkText: {
    fontSize: 10,
    color: "#94A3B8",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  legalBullet: {
    fontSize: 10,
    color: "#475569",
  },
  /* Downsell Modal Styles */
  downsellOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 99,
    elevation: 20,
  },
  downsellCard: {
    width: "100%",
    backgroundColor: "#0F172A",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  downsellIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  downsellTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  downsellDesc: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 14,
  },
  downsellOfferBox: {
    width: "100%",
    backgroundColor: "#162238",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BLUE_ACCENT,
    marginBottom: 16,
    position: "relative",
  },
  downsellOfferBadge: {
    position: "absolute",
    top: -9,
    backgroundColor: BLUE_ACCENT,
    color: "#070B14",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  downsellOfferPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
  },
  downsellOfferOldPrice: {
    fontSize: 11,
    color: TEXT_MUTED,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  downsellOfferSub: {
    fontSize: 11,
    color: "#38BDF8",
    fontWeight: "700",
    marginTop: 2,
  },
  downsellCtaBtn: {
    width: "100%",
    minHeight: 48,
    paddingVertical: 12,
    backgroundColor: BLUE_ACCENT,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  downsellCtaText: {
    color: "#070B14",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  downsellDismissBtn: {
    paddingVertical: 8,
  },
  downsellDismissText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});
