import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/AppTypography";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { useI18n } from "@/lib/i18n";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
}

type FeedbackType = "feature" | "bug" | "general";

const FEEDBACK_CATEGORIES: {
  id: FeedbackType;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}[] = [
  {
    id: "feature",
    label: "Feature Request",
    icon: "plus-circle",
    color: "#22C55E",
  },
  {
    id: "bug",
    label: "Bug Report",
    icon: "alert-triangle",
    color: "#EF4444",
  },
  {
    id: "general",
    label: "General Feedback",
    icon: "message-circle",
    color: "#38BDF8",
  },
];

export function FeedbackModal({
  visible,
  onClose,
  userEmail,
}: FeedbackModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [category, setCategory] = useState<FeedbackType>("feature");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber = Platform.OS === "ios"
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode;
  const deviceDiagnostics = `App Version: ${appVersion}${buildNumber ? ` (Build ${buildNumber})` : ""}\nPlatform: ${Platform.OS} (${Platform.Version})\nUser: ${userEmail || "Guest User"}`;

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert(
        t.feedback.emptyTitle,
        t.feedback.emptyMsg,
      );
      return;
    }

    void handleSendEmail();
  };

  const handleSendEmail = async () => {
    const categoryName =
      t.feedback.categories[category] ||
      FEEDBACK_CATEGORIES.find((c) => c.id === category)?.label ||
      "Feedback";
    const subject = `[TrainXP Feedback] ${categoryName}`;
    const body = `${content.trim()}\n\n---\n${deviceDiagnostics}`;
    const mailtoUrl = `mailto:support@calgo.tech?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    try {
      await Linking.openURL(mailtoUrl);
      setSubmitted(true);
    } catch {
      Alert.alert(
        t.feedback.mailErrorTitle,
        t.feedback.mailErrorMsg,
      );
    }
  };

  const handleDismiss = () => {
    setContent("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={handleDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
        >
          {/* Top Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleWrap}>
                <Feather name="message-square" size={20} color="#F97316" />
                <Text style={styles.sheetTitle}>
                  {t.feedback.title}
                </Text>
              </View>
              <Text style={styles.sheetSubtitle}>
                {t.feedback.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleDismiss();
              }}
              style={styles.closeIconBtn}
            >
              <Feather name="x" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {submitted ? (
            <View style={styles.successBox}>
              <View style={styles.successIconWrap}>
                <Feather name="check-circle" size={42} color="#22C55E" />
              </View>
              <Text style={styles.successTitle}>
                {t.feedback.thankYouTitle}
              </Text>
              <Text style={styles.successDesc}>
                {t.feedback.thankYouDesc}
              </Text>
              <Pressable onPress={handleDismiss} style={styles.closeSuccessBtn}>
                <Text style={styles.closeSuccessBtnText}>
                  {t.feedback.done}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Category Chips */}
              <Text style={styles.sectionLabel}>
                {t.feedback.topicLabel}
              </Text>
              <View style={styles.categoryRow}>
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const isActive = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        void Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        setCategory(cat.id);
                      }}
                      style={[
                        styles.categoryChip,
                        isActive && {
                          borderColor: cat.color,
                          backgroundColor: `${cat.color}15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && { color: cat.color, fontWeight: "700" },
                        ]}
                      >
                        {t.feedback.categories[cat.id] || cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Input Area */}
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                {t.feedback.descriptionLabel}
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={t.feedback.placeholder}
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={5}
                  style={styles.textInput}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{content.length}/500</Text>
              </View>

              {/* Diagnostic Strip */}
              <View style={styles.diagnosticCard}>
                <Feather name="info" size={14} color="#64748B" />
                <Text style={styles.diagnosticText}>
                  {t.feedback.diagnosticFmt
                    .replace("{platform}", Platform.OS.toUpperCase())
                    .replace("{version}", String(Platform.Version))}
                </Text>
              </View>

              {/* Action Buttons */}
              <Pressable onPress={handleSubmit} style={styles.submitBtn}>
                <Feather name="send" size={16} color="#080C14" />
                <Text style={styles.submitBtnText}>
                  {t.feedback.submitBtn}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSendEmail}
                style={styles.emailFallbackBtn}
              >
                <Feather name="mail" size={15} color="#38BDF8" />
                <Text style={styles.emailFallbackText}>
                  {t.feedback.emailFallback}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  dim: { flex: 1 },
  sheet: {
    backgroundColor: "#0B101B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    maxHeight: "92%",
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 18,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#162032",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#111724",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  inputWrap: {
    backgroundColor: "#111724",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 110,
    textAlignVertical: "top",
  },
  charCount: {
    alignSelf: "flex-end",
    color: "#64748B",
    fontSize: 11,
    marginTop: 4,
  },
  diagnosticCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  diagnosticText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F97316",
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    color: "#080C14",
    fontSize: 15,
    fontWeight: "800",
  },
  emailFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 4,
  },
  emailFallbackText: {
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "600",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  successIconWrap: {
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  closeSuccessBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeSuccessBtnText: {
    color: "#080C14",
    fontSize: 14,
    fontWeight: "800",
  },
});
