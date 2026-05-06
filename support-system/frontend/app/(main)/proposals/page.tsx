import { AppPageHeader } from "../../../components/layout/AppPageHeader";
import { PlatformPageFrame } from "../../../components/layout/PlatformPageFrame";
import { cardSurface } from "../../../components/dashboard/ui-classes";
import Link from "next/link";

export default function ProposalsListPage() {
  return (
    <PlatformPageFrame>
      <AppPageHeader title="내 제안서" description="작성 중·제출 완료 제안서 목록 (DB 연동 전)" />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={`${cardSurface} mx-auto max-w-2xl p-8 text-center`}>
          <p className="text-sm text-zinc-400">
            제안서 저장소와 목록 API는 다음 단계에서 연결됩니다. 새 제안서는{" "}
            <Link href="/proposals/new" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
              제안서 작성
            </Link>
            에서 시작하세요.
          </p>
        </div>
      </main>
    </PlatformPageFrame>
  );
}
