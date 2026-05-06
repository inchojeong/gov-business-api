import { AppPageHeader } from "../../../components/layout/AppPageHeader";
import { PlatformPageFrame } from "../../../components/layout/PlatformPageFrame";
import { cardSurface } from "../../../components/dashboard/ui-classes";

export default function SettingsPage() {
  return (
    <PlatformPageFrame>
      <AppPageHeader title="설정" description="계정·API 키·알림 (추후)" />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={`${cardSurface} mx-auto max-w-2xl p-8`}>
          <p className="text-sm text-zinc-400">OpenAI API 키 등 환경 설정은 이후 릴리스에서 제공합니다.</p>
        </div>
      </main>
    </PlatformPageFrame>
  );
}
