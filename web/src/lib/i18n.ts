export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'zh-TW'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const CONTENT_BASE_LOCALE: SupportedLocale = 'en';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  en: 'en',
  'en-us': 'en',
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hk': 'zh-TW',
};

export type LocaleMessages = {
  language: string;
  accountCenter: string;
  accountShortcutHint: string;
  accountIntro: string;
  accountStatus: string;
  accountReady: string;
  login: string;
  register: string;
  logout: string;
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  loginAction: string;
  registerAction: string;
  loggingIn: string;
  registering: string;
  sessionLoading: string;
  loggedInAs: string;
  upcomingFeatures: string;
  featurePreparationNote: string;
  submitBug: string;
  leaveFeedback: string;
  createBuild: string;
  updateGuide: string;
  comingSoon: string;
  authErrorGeneric: string;
  authErrorInvalidCredentials: string;
  authErrorEmailInUse: string;
  authErrorPasswordMismatch: string;
  authErrorPasswordTooShort: string;
  authErrorDisplayNameRequired: string;
  authErrorEmailRequired: string;
  authErrorPasswordRequired: string;
  featured: string;
  previousSlide: string;
  nextSlide: string;
  goToSlide: string;
  sections: string;
  emptySections: string;
  sectionEmptyState: string;
  nameSearch: string;
  searchByName: string;
  clear: string;
  more: string;
  or: string;
  and: string;
  itemsFound: string;
  notMatching: string;
  noFilterResults: string;
  noImage: string;
  rarity: string;
  howToGet: string;
  weapon: string;
  openPreview: string;
  closePreview: string;
};

const LOCALE_MESSAGES: Record<SupportedLocale, LocaleMessages> = {
  en: {
    language: 'Language',
    accountCenter: 'Account',
    accountShortcutHint: 'Sign in / Join',
    accountIntro:
      'The account foundation is ready here, so we can add bug reports, feedback, build sharing, and guide editing next.',
    accountStatus: 'Account status',
    accountReady: 'Your member identity is ready for future community features.',
    login: 'Sign in',
    register: 'Register',
    logout: 'Sign out',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    displayName: 'Display name',
    loginAction: 'Sign in',
    registerAction: 'Create account',
    loggingIn: 'Signing in...',
    registering: 'Creating account...',
    sessionLoading: 'Checking your account status...',
    loggedInAs: 'Signed in as',
    upcomingFeatures: 'Next up',
    featurePreparationNote:
      'These modules are being prepared around the new account system and can be opened up in later iterations.',
    submitBug: 'Submit bug reports',
    leaveFeedback: 'Leave feedback',
    createBuild: 'Create builds',
    updateGuide: 'Update guides',
    comingSoon: 'Soon',
    authErrorGeneric: 'Something went wrong. Please try again.',
    authErrorInvalidCredentials: 'Incorrect email or password.',
    authErrorEmailInUse: 'This email is already registered.',
    authErrorPasswordMismatch: 'The two passwords do not match.',
    authErrorPasswordTooShort: 'Password must be at least 8 characters.',
    authErrorDisplayNameRequired: 'Please enter a display name.',
    authErrorEmailRequired: 'Please enter an email address.',
    authErrorPasswordRequired: 'Please enter a password.',
    featured: 'Featured',
    previousSlide: 'Previous slide',
    nextSlide: 'Next slide',
    goToSlide: 'Go to {title}',
    sections: 'Sections',
    emptySections: 'Directus has no section data yet.',
    sectionEmptyState: 'There is no content in this section yet. Add items in Directus first.',
    nameSearch: 'Name search',
    searchByName: 'Search {sectionTitle} by name',
    clear: 'Clear',
    more: 'More',
    or: 'Or',
    and: 'And',
    itemsFound: 'Items found: {count}',
    notMatching: 'Not matching',
    noFilterResults: 'No {sectionTitle} match the current filters.',
    noImage: 'No image',
    rarity: 'Rarity',
    howToGet: 'How to get',
    weapon: 'Weapon',
    openPreview: 'Open skill preview',
    closePreview: 'Close preview',
  },
  'zh-CN': {
    language: '语言',
    accountCenter: '个人中心',
    accountShortcutHint: '登录 / 注册',
    accountIntro: '这里先把账号体系搭起来，后续会基于它开放提交 bug、留言、创建 BD、更新攻略等功能。',
    accountStatus: '账号状态',
    accountReady: '你的会员身份已经准备好，后续社区功能可以直接接进来。',
    login: '登录',
    register: '注册',
    logout: '退出登录',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    displayName: '昵称',
    loginAction: '登录账号',
    registerAction: '创建账号',
    loggingIn: '正在登录...',
    registering: '正在创建账号...',
    sessionLoading: '正在检查账号状态...',
    loggedInAs: '当前登录',
    upcomingFeatures: '后续能力',
    featurePreparationNote: '这些模块会基于现在的账号体系逐步开放，后面接功能时不需要再重搭用户底座。',
    submitBug: '提交 Bug',
    leaveFeedback: '留言反馈',
    createBuild: '创建 BD',
    updateGuide: '更新攻略',
    comingSoon: '即将开放',
    authErrorGeneric: '操作失败，请稍后再试。',
    authErrorInvalidCredentials: '邮箱或密码不正确。',
    authErrorEmailInUse: '这个邮箱已经注册过了。',
    authErrorPasswordMismatch: '两次输入的密码不一致。',
    authErrorPasswordTooShort: '密码至少需要 8 位。',
    authErrorDisplayNameRequired: '请输入昵称。',
    authErrorEmailRequired: '请输入邮箱。',
    authErrorPasswordRequired: '请输入密码。',
    featured: '精选',
    previousSlide: '上一张',
    nextSlide: '下一张',
    goToSlide: '跳转到 {title}',
    sections: '栏目',
    emptySections: 'Directus 中还没有栏目数据。',
    sectionEmptyState: '这个栏目里还没有内容，请先在 Directus 中新增数据。',
    nameSearch: '名称搜索',
    searchByName: '搜索 {sectionTitle}',
    clear: '清除',
    more: '更多',
    or: '或',
    and: '且',
    itemsFound: '找到 {count} 项',
    notMatching: '无匹配内容',
    noFilterResults: '没有找到符合当前筛选条件的 {sectionTitle}。',
    noImage: '暂无图片',
    rarity: '稀有度',
    howToGet: '获取方式',
    weapon: '武器',
    openPreview: '打开技能预览',
    closePreview: '关闭预览',
  },
  'zh-TW': {
    language: '語言',
    accountCenter: '個人中心',
    accountShortcutHint: '登入 / 註冊',
    accountIntro: '這裡先把帳號體系搭起來，後續會基於它開放提交 bug、留言、建立 BD、更新攻略等功能。',
    accountStatus: '帳號狀態',
    accountReady: '你的會員身份已經準備好，後續社群功能可以直接接進來。',
    login: '登入',
    register: '註冊',
    logout: '登出',
    email: '信箱',
    password: '密碼',
    confirmPassword: '確認密碼',
    displayName: '暱稱',
    loginAction: '登入帳號',
    registerAction: '建立帳號',
    loggingIn: '正在登入...',
    registering: '正在建立帳號...',
    sessionLoading: '正在檢查帳號狀態...',
    loggedInAs: '目前登入',
    upcomingFeatures: '後續能力',
    featurePreparationNote: '這些模組會基於現在的帳號體系逐步開放，後面接功能時不需要再重建使用者底座。',
    submitBug: '提交 Bug',
    leaveFeedback: '留言回饋',
    createBuild: '建立 BD',
    updateGuide: '更新攻略',
    comingSoon: '即將開放',
    authErrorGeneric: '操作失敗，請稍後再試。',
    authErrorInvalidCredentials: '信箱或密碼不正確。',
    authErrorEmailInUse: '這個信箱已經註冊過了。',
    authErrorPasswordMismatch: '兩次輸入的密碼不一致。',
    authErrorPasswordTooShort: '密碼至少需要 8 碼。',
    authErrorDisplayNameRequired: '請輸入暱稱。',
    authErrorEmailRequired: '請輸入信箱。',
    authErrorPasswordRequired: '請輸入密碼。',
    featured: '精選',
    previousSlide: '上一張',
    nextSlide: '下一張',
    goToSlide: '跳轉到 {title}',
    sections: '欄目',
    emptySections: 'Directus 中還沒有欄目資料。',
    sectionEmptyState: '這個欄目裡還沒有內容，請先在 Directus 中新增資料。',
    nameSearch: '名稱搜尋',
    searchByName: '搜尋 {sectionTitle}',
    clear: '清除',
    more: '更多',
    or: '或',
    and: '且',
    itemsFound: '找到 {count} 項',
    notMatching: '無符合內容',
    noFilterResults: '沒有找到符合當前篩選條件的 {sectionTitle}。',
    noImage: '暫無圖片',
    rarity: '稀有度',
    howToGet: '獲取方式',
    weapon: '武器',
    openPreview: '打開技能預覽',
    closePreview: '關閉預覽',
  },
};

const INTERNAL_PATH_PREFIXES = ['/api', '/image', '/fonts', '/_next'];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function resolveLocale(locale?: string | null): SupportedLocale {
  const normalized = String(locale || '').trim().toLowerCase();
  return LOCALE_ALIASES[normalized] || DEFAULT_LOCALE;
}

export function getLocaleLabel(locale: string) {
  return LOCALE_LABELS[resolveLocale(locale)];
}

export function getLocaleMessages(locale: string) {
  return LOCALE_MESSAGES[resolveLocale(locale)];
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function hasLocalePrefix(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  const firstSegment = segments[0].trim().toLowerCase();
  return Boolean(LOCALE_ALIASES[firstSegment]);
}

export function replaceLocaleInPathname(pathname: string, nextLocale: string) {
  const locale = resolveLocale(nextLocale);
  const cleanPath = pathname || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `/${locale}`;
  }

  if (hasLocalePrefix(cleanPath)) {
    segments[0] = locale;
    return `/${segments.join('/')}`;
  }

  return `/${locale}/${segments.join('/')}`;
}

export function localizeInternalHref(href: string, nextLocale: string) {
  if (!href || /^https?:\/\//i.test(href)) {
    return href;
  }

  const locale = resolveLocale(nextLocale);

  try {
    const url = new URL(href, 'http://local.test');
    const pathname = url.pathname || '/';

    if (INTERNAL_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return `${pathname}${url.search}${url.hash}`;
    }

    const localizedPath = replaceLocaleInPathname(pathname, locale);
    return `${localizedPath}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
