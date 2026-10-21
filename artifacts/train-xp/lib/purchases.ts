import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";

// Configuration keys - can be supplied via EXPO_PUBLIC_* env vars
const API_KEY_APPLE = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "";
const API_KEY_GOOGLE = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "";

export const TERMS_OF_USE_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const PRIVACY_POLICY_URL = "https://trainxp.vercel.app/privacy";

export const PRO_ENTITLEMENT_ID = "trainxp_pro";
export const TRAINXP_OFFERING_ID = "trainxp_pro";
export const TRAINXP_ANNUAL_DISCOUNT_PACKAGE_ID = "annual_discount";

let isConfigured = false;
let configuration: Promise<boolean> | null = null;

export async function initPurchases(userId?: string): Promise<boolean> {
  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    (Constants as any).appOwnership === "expo";

  if (isExpoGo || (Platform.OS !== "ios" && Platform.OS !== "android")) {
    // Native IAP stores are unavailable inside Expo Go / Web without native dev client
    return false;
  }

  const apiKey = Platform.OS === "ios" ? API_KEY_APPLE : API_KEY_GOOGLE;
  if (!apiKey) {
    // Graceful fallback for local development without keys
    return false;
  }

  if (isConfigured) {
    if (userId) {
      await syncPurchasesUser(userId);
    }
    return true;
  }

  if (configuration) {
    const ready = await configuration;
    if (ready && userId) await syncPurchasesUser(userId);
    return ready;
  }
  configuration = configurePurchases(apiKey, userId).finally(() => {
    configuration = null;
  });
  return configuration;
}

async function configurePurchases(
  apiKey: string,
  userId?: string,
): Promise<boolean> {
  try {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    await Purchases.configure({
      apiKey,
      appUserID: userId,
    });
    isConfigured = true;
    return true;
  } catch (error) {
    console.warn("[Purchases] Failed to configure RevenueCat:", error);
    return false;
  }
}

export function setupPurchasesListener(
  onProStatusChange: (isPro: boolean) => void,
): () => void {
  if (!isConfigured) {
    return () => {};
  }

  const listener = (customerInfo: CustomerInfo) => {
    const isPro = Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
    onProStatusChange(isPro);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function syncPurchasesUser(
  userId: string,
): Promise<CustomerInfo | null> {
  if (!isConfigured || !userId) return null;
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

export async function logOutPurchases(): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn("[Purchases] logOut notice:", err);
  }
}

export interface PackageDisplay {
  id: "annual" | "annual_discount" | "monthly" | "weekly";
  rcPackage?: PurchasesPackage;
  title: string;
  priceString: string;
  periodText: string;
  perMonthPrice?: string;
  strikePrice?: string;
  badge?: string;
  discountPct?: string;
  hasTrial?: boolean;
}

export async function fetchOfferings(): Promise<{
  annual: PackageDisplay;
  annualDiscount?: PackageDisplay;
  monthly: PackageDisplay;
  weekly: PackageDisplay;
}> {
  const fallbackAnnual: PackageDisplay = {
    id: "annual",
    title: "1 Năm",
    priceString: "—",
    periodText: "/ năm",
    perMonthPrice: "—",
    badge: "THANH TOÁN THEO NĂM",
    hasTrial: false,
  };

  const fallbackMonthly: PackageDisplay = {
    id: "monthly",
    title: "1 Tháng",
    priceString: "—",
    periodText: "/ tháng",
    badge: "LINH HOẠT",
    hasTrial: false,
  };

  const fallbackWeekly: PackageDisplay = {
    id: "weekly",
    title: "1 Tuần",
    priceString: "—",
    periodText: "/ tuần",
    badge: "NGẮN HẠN",
    hasTrial: false,
  };

  if (!isConfigured) {
    return {
      annual: fallbackAnnual,
      monthly: fallbackMonthly,
      weekly: fallbackWeekly,
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const trainXpOffering = offerings.all[TRAINXP_OFFERING_ID];
    if (!trainXpOffering) {
      console.warn("[Purchases] TrainXP offering is unavailable:", TRAINXP_OFFERING_ID);
      return {
        annual: fallbackAnnual,
        monthly: fallbackMonthly,
        weekly: fallbackWeekly,
      };
    }
    if (!trainXpOffering.availablePackages.length) {
      console.warn(
        "[Purchases] TrainXP offering has no packages configured:",
        TRAINXP_OFFERING_ID,
      );
      return {
        annual: fallbackAnnual,
        monthly: fallbackMonthly,
        weekly: fallbackWeekly,
      };
    }

    const findPackage = (
      type: "annual" | "monthly" | "weekly",
      rcDirect?: PurchasesPackage | null,
    ) => {
      if (rcDirect) return rcDirect;
      const list = trainXpOffering.availablePackages || [];
      return (
        list.find((p) => {
          const id = (p.identifier || "").toLowerCase();
          const prodId = (p.product?.identifier || "").toLowerCase();
          const identifiers = `${id} ${prodId}`;
          if (type === "annual")
            return (
              !id.includes("discount") &&
              !prodId.includes("discount") &&
              (identifiers.includes("annual") || identifiers.includes("year"))
            );
          if (type === "monthly")
            return (
              identifiers.includes("monthly") || identifiers.includes("month")
            );
          if (type === "weekly")
            return (
              identifiers.includes("weekly") || identifiers.includes("week")
            );
          return false;
        }) || null
      );
    };

    const rcAnnual = findPackage("annual", trainXpOffering.annual);
    const rcAnnualDiscount =
      trainXpOffering.availablePackages.find(
        (pkg) =>
          (pkg.identifier || "").toLowerCase() ===
          TRAINXP_ANNUAL_DISCOUNT_PACKAGE_ID,
      ) || null;
    const rcMonthly = findPackage("monthly", trainXpOffering.monthly);
    const rcWeekly = findPackage("weekly", trainXpOffering.weekly);
    console.info(
      "[Purchases] TrainXP offering and products:",
      trainXpOffering.identifier,
      trainXpOffering.availablePackages.map((pkg) => pkg.product.identifier),
    );

    return {
      annual: rcAnnual
        ? {
            id: "annual",
            rcPackage: rcAnnual,
            title: rcAnnual.product.title || "Yearly Plan",
            priceString: rcAnnual.product.priceString,
            periodText: "/ year",
            perMonthPrice: new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: rcAnnual.product.currencyCode,
            }).format(rcAnnual.product.price / 12),
            badge: "BEST VALUE",

            hasTrial: false,
          }
        : fallbackAnnual,
      annualDiscount: rcAnnualDiscount
        ? {
            id: "annual_discount",
            rcPackage: rcAnnualDiscount,
            title: rcAnnualDiscount.product.title || "Discounted Yearly Plan",
            priceString: rcAnnualDiscount.product.priceString,
            periodText: "/ year",
            perMonthPrice: new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: rcAnnualDiscount.product.currencyCode,
            }).format(rcAnnualDiscount.product.price / 12),
            badge: "ANNUAL DISCOUNT",
            hasTrial: false,
          }
        : undefined,
      monthly: rcMonthly
        ? {
            id: "monthly",
            rcPackage: rcMonthly,
            title: rcMonthly.product.title || "Monthly Plan",
            priceString: rcMonthly.product.priceString,
            periodText: "/ month",
            badge: "FLEXIBLE",
            hasTrial: false,
          }
        : fallbackMonthly,
      weekly: rcWeekly
        ? {
            id: "weekly",
            rcPackage: rcWeekly,
            title: rcWeekly.product.title || "Weekly Plan",
            priceString: rcWeekly.product.priceString,
            periodText: "/ week",
            badge: "WEEKLY",
            hasTrial: false,
          }
        : fallbackWeekly,
    };
  } catch (error) {
    console.warn(
      "[Purchases] Failed to fetch offerings, using fallback:",
      error,
    );
    throw error;
  }
}

export async function purchaseSubscription(
  pkg: PackageDisplay,
): Promise<boolean> {
  if (!isConfigured || !pkg.rcPackage) return false;

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch (error: any) {
    if (!error.userCancelled) {
      throw error;
    }
    return false;
  }
}

export async function restoreSubscription(): Promise<boolean> {
  if (!isConfigured) {
    // No keys configured in mock mode
    return false;
  }

  try {
    const customerInfo: CustomerInfo = await Purchases.restorePurchases();
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch (error) {
    console.warn("[Purchases] Restore error:", error);
    throw error;
  }
}

export async function checkHasProEntitlement(): Promise<boolean | null> {
  if (!isConfigured) return null;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  } catch {
    return null;
  }
}
