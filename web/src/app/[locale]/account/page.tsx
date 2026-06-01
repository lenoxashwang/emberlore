import AccountCenter from '@/components/account-center';
import { getLocaleMessages, resolveLocale } from '@/lib/i18n';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const messages = getLocaleMessages(locale);

  return <AccountCenter messages={messages} />;
}
