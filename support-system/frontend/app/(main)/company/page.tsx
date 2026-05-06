import { AppPageHeader } from "../../../components/layout/AppPageHeader";
import { PlatformPageFrame } from "../../../components/layout/PlatformPageFrame";
import { cardSurface } from "../../../components/dashboard/ui-classes";

export default function CompanyPage() {
  return (
    <PlatformPageFrame>
      <AppPageHeader title="기업 정보" description="조직 프로필·인증 정보 (추후 MySQL 연동)" />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={`${cardSurface} mx-auto max-w-2xl p-8`}>
          <p className="text-sm text-zinc-400">
            기업 마스터 데이터와 제안서 워크플로우의 `CompanyProfileDraft`는 별도 레이어로 동기화할 예정입니다.
          </p>
        </div>
      </main>
    </PlatformPageFrame>
  );
}
