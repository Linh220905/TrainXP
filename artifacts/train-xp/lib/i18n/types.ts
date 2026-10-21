export type SupportedLocale = "vi" | "en";

export interface TranslationDictionary {
  // Navigation & Tabs
  tabs: {
    home: string;
    plan: string;
    workout: string;
    stats: string;
    profile: string;
  };

  // Common UI
  common: {
    back: string;
    next: string;
    continue: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    done: string;
    start: string;
    finish: string;
    search: string;
    loading: string;
    all: string;
    rest: string;
    kg: string;
    lbs: string;
    reps: string;
    sets: string;
    rir: string;
    weight: string;
    day: string;
    days: string;
    week: string;
    month: string;
    year: string;
    exercises: string;
    discard: string;
    discardChangesQuestion: string;
    actionFailed: string;
    pleaseRetry: string;
    success: string;
    errorTitle: string;
    errorReloadMsg: string;
    tryAgain: string;
    dateLocale: string;
  };

  // Welcome Screen
  welcome: {
    skip: string;
    next: string;
    start: string;
    account: string;
    login: string;
    switchLanguageA11y: string;
    languageBadge: string;
    slides: Array<{
      eyebrow: string;
      title: string;
      highlight: string;
      description: string;
    }>;
    today: string;
    upper: string;
    exercise: string;
    sets: string;
    progress: string;
    record: string;
    complete: string;
    earned: string;
    team: string;
    together: string;
    active: string;
    friendRecord: string;
    encouragement: string;
    streak: string;
    days: string;
    week: string[];
    unlocked: string;
    firstStep: string;
    reward: string;
    viewPage: string;
  };

  // Home Screen
  home: {
    trainingHub: string;
    readyPrompt: string;
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    weeklyQuest: string;
    daysTrained: string;
    xpProgress: string;
    level: string;
    startTodayPlan: string;
    noPlanToday: string;
    restDay: string;
    quickLogWeight: string;
    recentWorkouts: string;
    activeTargetMap: string;
    recoveryStatus: string;
    streakCommitment: string;
    logBodyWeight: string;
    weightSubtitle: string;
    disciplineAllTheTime: string;
    hubOften: string;
    journeySometimes: string;
    targetMapSub: string;
    goalDaysPerWeek: string;
    streakPrefix: string;
    weeksShort: string;
    daysShort: string[];
    invalidWeightTitle: string;
    invalidWeightMsg: string;
  };

  // Plan Screen
  plan: {
    title: string;
    subtitle: string;
    weeklySchedule: string;
    tapToAssign: string;
    routines: string;
    createRoutine: string;
    loadStarterPlan: string;
    routineEditor: string;
    routineName: string;
    progressionPolicy: string;
    addExercise: string;
    superset: string;
    unlinkSuperset: string;
    linkSuperset: string;
    removeExercise: string;
    selectExercise: string;
    targetMuscles: string;
    restDayNotice: string;
    assignToDay: string;
    noExercisesInRoutine: string;
    noRoutines: string;
    currentExercises: string;
    exercisesUnit: string;
    splitFullBody: string;
    splitPushPullLegs: string;
    splitUpperLower: string;
    splitPPLUpperLower: string;
    splitPPLHighVolume: string;
    regeneratePlanTitle: string;
    regeneratePlanMsg: string;
    regenerate: string;
    discardChangesTitle: string;
    discardChangesAction: string;
    exerciseAddedTitle: string;
    exerciseAddedMsg: string;
    invalidRoutineTitle: string;
    invalidRoutineMsg: string;
    chooseProgression: string;
    supersetToggleA11y: string;
    moveUpA11y: string;
    moveDownA11y: string;
    removeExA11y: string;
    targetMusclesA11y: string;
    primaryTarget: string;
    deleteRoutineTitle: string;
    deleteRoutineMsg: string;
    frequency: string;
    daysUnit: string;
    newRoutineBtn: string;
    resetBtn: string;
    exerciseLibraryTitle: string;
    browseAll: string;
    exerciseCountFmt: string;
    planAction: string;
    exerciseDetailsTitle: string;
    addToRoutineAction: string;
    selectRoutineTitle: string;
    selectRoutineSub: string;
    closeEditorA11y: string;
    activeSplitBadge: string;
    dayNames: string[];
    libraryCardSub: string;
    searchExercisesPlaceholder: string;
    muscleFilters: Record<string, string>;
    instructionsHeader: string;
    createFirstRoutine: string;
    currentRoutineExercisesFmt: string;
    equipmentNames: Record<string, string>;
  };

  // Workout Screen
  workout: {
    title: string;
    startChooserTitle: string;
    startChooserSub: string;
    todaysRoutine: string;
    startSession: string;
    otherRoutines: string;
    freestyleTitle: string;
    freestyleDesc: string;
    startFreestyle: string;
    liveSession: string;
    finishWorkout: string;
    cancelSession: string;
    addExercise: string;
    restTimer: string;
    skipRest: string;
    setNumber: string;
    targetWeight: string;
    targetReps: string;
    actualReps: string;
    markDone: string;
    effortRir: string;
    summaryTitle: string;
    summarySub: string;
    totalVolume: string;
    completedSets: string;
    musclesHit: string;
    newRecords: string;
    viewAnalytics: string;
    exercisesUnit: string;
    durationLabel: string;
    setsLabel: string;
    instructions: string;
    plateCalculator: string;
    plateEachSide: string;
    targetWeightLabel: string;
    barbell: string;
    eachSideWeight: string;
    targetWeightMinError: string;
    emptyBarOnly: string;
    plateNoExactMatch: string;
    noValidExercisesTitle: string;
    noValidExercisesMsg: string;
    discardWorkoutTitle: string;
    discardWorkoutMsg: string;
    keepTraining: string;
    discardWorkoutAction: string;
    invalidSetValuesTitle: string;
    invalidSetValuesMsg: string;
    noCompletedSetsTitle: string;
    noCompletedSetsMsg: string;
    saveWorkoutFailedTitle: string;
    warmup: string;
    dropSet: string;
    failure: string;
    work: string;
    lastTime: string;
    motion: string;
    muscles: string;
    addSet: string;
    addDropSet: string;
    setTypesHelp: string;
    addToWorkout: string;
    plateEachSideWeight: string;
    draftSaveFailedRetry: string;
    setTypeA11y: string;
    setWeightA11y: string;
    setRepsA11y: string;
    setRirA11y: string;
    setCompleteA11y: string;
    addSetA11y: string;
    addDropSetA11y: string;
    tapBadgeToCycle: string;
    nextExercise: string;
    noExercisesFound: string;
    noResultsMatching: string;
    plateNoExactMatchRem: string;
  };

  // Stats Screen
  stats: {
    title: string;
    subtitle: string;
    totalWorkouts: string;
    thisMonth: string;
    weekStreak: string;
    weightChange: string;
    activityHeatmap: string;
    muscleBalance: string;
    allSets: string;
    hardSets: string;
    mostTrained: string;
    needsFocus: string;
    effortAnalytics: string;
    averageRir: string;
    nearFailurePct: string;
    bodyweightTrend: string;
    goalLine: string;
    logWeight: string;
    oneRepMaxProgression: string;
    selectExerciseToView: string;
    personalRecords: string;
    recentSessions: string;
    noDataInPeriod: string;
    rirGuide: string;
    logWeightShort: string;
    noSessionsYet: string;
    deleteWorkout: string;
    invalidWeightTitle: string;
    invalidWeightMsg: string;
    searchExercisesPlaceholder: string;
    noExercisesFound: string;
    goal: string;
    deleteWorkoutTitle: string;
    deleteWorkoutMsg: string;
    deleteAction: string;
    understandRir: string;
    logBtn: string;
    activityMatrixTitle: string;
    less: string;
    more: string;
  };

  // Profile Screen
  profile: {
    title: string;
    subtitle: string;
    personalInfo: string;
    fitnessGoal: string;
    experienceLevel: string;
    equipment: string;
    targetFocus: string;
    settings: string;
    language: string;
    unitSystem: string;
    proMembership: string;
    resetOnboarding: string;
    proUnlocked: string;
    upgradePro: string;
    metricGuide: string;
    metricGuideSub: string;
    feedback: string;
    feedbackSub: string;
    appSettings: string;
    appSettingsSub: string;
    rateApp: string;
    autoRestTimer: string;
    soundAndHaptics: string;
    muscleBalance: string;
    chest: string;
    back: string;
    arms: string;
    legs: string;
    shoulders: string;
    core: string;
    appleConnected: string;
    googleConnected: string;
    rateAppTitle: string;
    rateAppMsg: string;
    maybeLater: string;
    rate5Stars: string;
    deleteAccountTitle: string;
    deleteAccountMsg: string;
    resetOnboardingTitle: string;
    resetOnboardingMsg: string;
    resetAction: string;
    challengeSessions: string;
    challengeVolume: string;
    bmiUnderweight: string;
    bmiNormal: string;
    bmiOverweight: string;
    bmiObese: string;
    bmiInfoTitle: string;
    bmiInfoBody: string;
    bmiInfoSource: string;
    bmiInfoLinkError: string;
    genderLabel: string;
    genderFemale: string;
    genderMale: string;
    heightLabel: string;
    weightLabel: string;
    streakUnit: string;
    streakLabel: string;
    missionsLabel: string;
    targetMusclesFocus: string;
    syncLocal: string;
    syncSyncing: string;
    syncSynced: string;
    syncError: string;
    accountAndCloud: string;
    linkedPrefix: string;
    syncProgressDesc: string;
    signOut: string;
    signInApple: string;
    signInGoogle: string;
    proActive: string;
    proUpgrade: string;
    proXpPerWorkout: string;
    proBenefit1: string;
    proBenefit2: string;
    proBenefit3: string;
    levelProgression: string;
    weeklyDirectives: string;
    daysRemaining: string;
    collapse: string;
    expand: string;
    resourcesAndSupport: string;
    resourcesDesc: string;
    metrics7Tag: string;
    exploreGuide: string;
    restart25Steps: string;
    closeSettings: string;
    workoutPreferences: string;
    autoRestTimerDesc: string;
    soundAndHapticsDesc: string;
    scienceAndSupport: string;
    rateAppSub: string;
    restartAssessmentSub: string;
    accountAndSync: string;
    signInAccount: string;
    termsOfUse: string;
    privacyPolicy: string;
    deleteAccountPermanently: string;
    unableToOpenLink: string;
  };

  // Muscle groups
  muscles: Record<string, string>;

  // Progression names
  progression: {
    linear: string;
    linearDesc: string;
    greyskull: string;
    greyskullDesc: string;
    double: string;
    doubleDesc: string;
    off: string;
    offDesc: string;
  };

  // Onboarding Screen
  onboarding: {
    // Action Buttons
    continue: string;
    skip: string;
    confirmRoutine: string;
    enableNotifications: string;
    claimOffer: string;
    alreadyHaveAccount: string;
    logIn: string;

    // Motivations
    motivations: Record<string, string>;

    // Goals
    goals: Record<string, string>;

    // Sensitive Areas
    sensitiveAreas: Record<string, string>;

    // Experience Options
    experience: Record<string, { label: string; sub: string }>;

    // Body Types
    bodyTypes: Record<string, string>;

    // Equipment
    equipmentCategories: Record<string, string>;
    equipmentItems: Record<string, string>;

    // Muscle Targets
    workoutMuscles: Record<string, string>;

    // Fallback Warrior Name
    defaultWarriorName: string;

    // Step 0
    nameTitle: string;
    nameSubtitle: string;
    namePlaceholder: string;

    // Step 1
    unitTitle: string;
    unitSubtitle: string;
    imperialLabel: string;
    metricLabel: string;

    // Step 2
    weightTitle: string;
    weightSubtitle: string;
    currentWeight: string;

    // Step 3
    heightTitle: string;
    heightSubtitle: string;
    currentHeight: string;

    // Step 4
    thinkFitnessTitle: string;
    thinkNever: string;
    thinkSometimes: string;
    thinkOften: string;
    thinkAllTheTime: string;

    // Step 5
    strugglesTitle: string;
    strugglesSubtitle: string;

    // Step 6
    focusAreasTitle: string;
    focusAreasSubtitle: string;
    focusAreas: Record<string, string>;
    frontView: string;
    backView: string;

    // Step 7
    routineTitle: string;
    routineYes: string;
    routineNo: string;

    // Step 8
    equipmentTitle: string;
    equipmentSubtitle: string;

    // Step 9
    lastMusclesTitle: string;

    // Step 10
    durationTitle: string;
    duration45: string;
    duration45Sub: string;
    duration60: string;
    duration60Sub: string;
    duration90: string;
    duration90Sub: string;

    // Step 11
    frequencyTitle: string;
    daysPerWeekTab: string;
    specificDaysTab: string;
    daysPerWeekFmt: string;
    everyDay: string;
    freqSolid: string;
    freqGood: string;
    freqGreat: string;
    freqIncredible: string;
    freqOutstanding: string;

    // Alerts & Validation
    nameRequiredTitle: string;
    nameRequiredMsg: string;
    invalidWeightTitle: string;
    invalidWeightMsg: string;
    invalidHeightTitle: string;
    invalidHeightMsg: string;
    signInFailedTitle: string;
    signInFailedMsg: string;

    // Step 12
    goalAndExpTitle: string;
    goalAndExpSub: string;
    trainingGoalLabel: string;
    trainingExpLabel: string;
    genderLabel: string;
    genderMale: string;
    genderFemale: string;
    relateTitle: string;
    relateQuote: string;
    yes: string;
    no: string;

    // Step 13
    trackProgressTitle: string;
    aiFitnessAnalysisBadge: string;
    trackProgressSub: string;
    muscleBalanceProfile: string;
    optimalTrainingSplit: string;
    balancedScore: string;
    trackBenefit1: string;
    trackBenefit2: string;
    trackBenefit3: string;
    trackBenefitSymmetryDesc: string;
    trackBenefitOverloadDesc: string;
    trackBenefitSafetyDesc: string;

    // Step 14
    prSquatTitle: string;
    prSquatSubtitle: string;

    // Step 15
    trophyUnlockedTag: string;
    trophyUnlockedTitle: string;
    trophyUnlockedSub: string;
    trophyTierBronze1: string;
    trophyActivatedBadge: string;
    trophyTopPercentileBadge: string;
    trophyBenchName: string;
    trophyBenchDesc: string;

    // Step 16
    trophiesProgressTag: string;
    trophiesProgressTitle: string;
    trophiesProgressSubtitle: string;
    trophyBenchMax: string;
    trophyDeadliftMax: string;
    trophySquatMax: string;
    trophyAllStarMax: string;
    trophyAllStarBeast: string;

    // Step 17
    aiPredictionBadge: string;
    predictSilverTitle: string;
    trajectoryStrengthLabel: string;
    trajectoryDurationLabel: string;
    trajectoryGrowthLabel: string;
    todayLabel: string;
    dec28Label: string;
    youAreIncredible: string;
    incredibleSubtitle: string;

    // Step 18
    strongerGoalTitle: string;
    strongerGoalBadge: string;

    // Step 19
    speedGoalTitle: string;
    speedGoalHeader: string;
    speedGoalDesc: string;
    weeksLabel: string;
    speedFast: string;
    speedRecommended: string;
    speedSustainable: string;
    speedSlow: string;

    // Step 20
    levelUpTag: string;
    levelUpTitle: string;
    levelUpSubtitle: string;
    levelProgress: string;

    // Routine Preparation
    preparingRoutine: string;
    completedPct: string;
    analyzingMuscles: string;
    calculatingOverload: string;
    finalizingPlan: string;
    sessionsPerWeekTag: string;

    // Routine Overview
    routineOverviewTitle: string;
    routineOverviewDesc: string;
    weeklyGoalLabel: string;
    workoutsCount: string;
    workoutTimeLabel: string;
    designedMuscleGrowth: string;
    designedMuscleGrowthDesc: string;
    workoutsListTitle: string;
    pushWorkoutSub: string;
    pullWorkoutSub: string;
    legsWorkoutSub: string;
    dayLetterFmt: string;
    exercisesCount: string;

    // Streak Start
    disciplineStreakBadge: string;
    streakStartTitle: string;
    streakStartHighlight: string;
    streakStartSubtitle: string;
    streakXpBonusText: string;
    streakHint: string;

    // Commit to Workout
    commitWorkoutTitle: string;
    commitWorkoutSubtitle: string;
    dayStreakFmt: string;
    moreLikelyGoal: string;

    // Notifications (Legacy)
    enableNotifTitle: string;
    enableNotifSubtitle: string;
    notifRestTitle: string;
    notifRestBody: string;
    notifStreakTitle: string;
    notifStreakBody: string;

    // Social Proof (Legacy)
    trustedUsersTitle: string;
    trustedUsersHighlight: string;
    ratingsCount: string;
    ratingsLabel: string;
    workoutsCountStat: string;
    workoutsLabel: string;
    testimonialTitle: string;
    testimonialBody: string;
    testimonialAuthor: string;

    // Biometric Pledge
    commitmentPledgeBadge: string;
    pledgeTitleFmt: string;
    pledgeSub: string;
    pledgeItemStreak: string;
    pledgeItemOverload: string;
    pledgeItemHonor: string;
    scanningCommitStatus: string;
    touchAndHoldCommit: string;
    holdWaveExpandsSub: string;
    pledgeTitle: string;
    pledgeBody: string;
    tapAndHoldCommit: string;

    // You Are Ready
    youAreReady: string;
    youAreReadySub: string;
    readyRoutineGenerated: string;
    readyStreakPledged: string;
    readyRanksArmed: string;

    // Arrow Dissected Onboarding Extensions
    valueProp1Title: string;
    valueProp1Sub: string;
    valueProp2Title: string;
    valueProp2Sub: string;
    valueProp3Title: string;
    valueProp3Sub: string;
    genderTitle: string;
    genderSubtitle: string;
    dobTitle: string;
    dobSubtitle: string;
    yearLabel: string;
    monthLabel: string;
    dayLabel: string;
    fitnessLevelTitle: string;
    fitnessLevelSubtitle: string;
    benchPrTitle: string;
    benchPrSubtitle: string;
    deadliftPrTitle: string;
    deadliftPrSubtitle: string;
    prHelpText: string;
    levelJourneyTitle: string;
    levelJourneySubtitle: string;
    levelJourneyCurrent: string;
    levelJourneyNext: string;
    multiplierReadout: string;
    notifPermissionTitle: string;
    notifPermissionSub: string;
    maybeLater: string;
    referralTitle: string;
    referralOptions: Record<string, string>;
    ratingTitle: string;
    ratingSub: string;
    saveProgressTitle: string;
    saveProgressSub: string;
    signInApple: string;
    signInGoogle: string;
    loadingProfile: string;
    invalidDobTitle: string;
    invalidDobMsg: string;
    invalidBenchmarkTitle: string;
    invalidBenchmarkMsg: string;
    checkProfileTitle: string;
    checkProfileMsg: string;
    missingFieldsTitle: string;
    missingFieldsMsg: string;
    syncCloudError: string;
    incorrectCredentialsMsg: string;
    appleSignInError: string;
    googleSignInError: string;
    goalTitle: string;
    goalSubtitle: string;
    trainingExpTitle: string;
    sessionDurationTitle: string;
    minutesUnit: string;
    sensitiveJointsTitle: string;
    sensitiveJointNames: Record<string, string>;
    yourProfileTitle: string;
    yourProfileSubtitle: string;
    nameNotice: string;
    signInTitle: string;
    signInSubtitle: string;
    usernameOrEmail: string;
    passwordLabel: string;
    signInBtn: string;
    orContinueWith: string;
    continueWithGoogle: string;
    continueWithApple: string;
    skipAndContinue: string;
    guestContinue: string;
    guestContinueNotice: string;
    months: Record<string, string>;
    dateOfBirthFmt: string;
    minAgeWarning: string;
    yearsOldFmt: string;
  };

  // Paywall Modal
  paywall: {
    restorePurchases: string;
    heroTitle: string;
    heroSubtitle: string;
    featureTitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    feature4: string;
    discountBadge: string;
    discountSub: string;
    specialDeal: string;
    perYear: string;
    perMonth: string;
    perWeek: string;
    bestValueBadge: string;
    annualTitle: string;
    annualSub: string;
    annualDesc: string;
    annualPerMonth: string;
    monthlyTitle: string;
    monthlySub: string;
    monthlyDesc: string;
    weeklyTitle: string;
    weeklySub: string;
    weeklyDesc: string;
    startTrialCta: string;
    startCta: string;
    noCommitment: string;
    purchaseError: string;
    purchaseErrorDefault: string;
    restoreSuccess: string;
    restoreSuccessDesc: string;
    noSubFound: string;
    noSubFoundDesc: string;
    restoreFailed: string;
    restoreFailedDesc: string;
    termsOfUse: string;
    privacyPolicy: string;
    autoRenewDisclosure: string;
    downsellTitle: string;
    downsellDesc: string;
    downsellCta: string;
    downsellDismiss: string;
    closePaywall: string;
    plansUnavailableRetry: string;
    retry: string;
    unableToOpenLink: string;
  };

  // Not Found Screen
  notFound: {
    title: string;
    message: string;
    goToHome: string;
  };

  // Training Metrics Guide Modal
  trainingMetrics: {
    closeGuide: string;
    trainingLibraryTag: string;
    trainingGuideTitle: string;
    trainingGuideSubtitle: string;
    searchPlaceholder: string;
    searchA11y: string;
    clearSearchA11y: string;
    searchResultCountFmt: string;
    searchResultAllFmt: string;
    tapToExplore: string;
    inPractice: string;
    noMetricsFound: string;
    noMetricsFoundSub: string;
    viewAllMetrics: string;
    gotIt: string;
    items: Record<
      string,
      {
        badge: string;
        title: string;
        definition: string;
        guide: string;
      }
    >;
  };

  // Feedback & Bug Report Modal
  feedback: {
    emptyTitle: string;
    emptyMsg: string;
    mailErrorTitle: string;
    mailErrorMsg: string;
    title: string;
    subtitle: string;
    thankYouTitle: string;
    thankYouDesc: string;
    done: string;
    topicLabel: string;
    descriptionLabel: string;
    placeholder: string;
    diagnosticFmt: string;
    submitBtn: string;
    emailFallback: string;
    categories: Record<string, string>;
  };

  // Trophy Showcase Component
  trophyShowcase: {
    highlightTitle: string;
    viewAllCatalog: string;
    lockedBadge: string;
    noPrYet: string;
    tapToView: string;
    catalogTitle: string;
    catalogSubtitle: string;
    setsAndTiersSubtitle: string;
    catalogTiersSub: string;
    noRecordLogged: string;
    mythicPrismaticReached: string;
    nextGoalFmt: string;
    baselinePr: string;
    close: string;
    unrankedBadge: string;
    currentBadge: string;
    unlockedBadge: string;
    currentBenchmarkFmt: string;
    nextBenchmarkFmt: string;
    maxTierAchieved: string;
    lifts: Record<string, string>;
  };

  // Notifications
  notifications: {
    workoutReminderChannel: string;
    workoutReminderBody: string;
  };
}
