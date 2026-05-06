import { Suspense } from "react";
import { AppPageHeader } from "../../../../components/layout/AppPageHeader";
import { PlatformPageFrame } from "../../../../components/layout/PlatformPageFrame";
import { NewProposalWorkflow } from "../../../../components/proposal-workflow/NewProposalWorkflow";
import { cardSurface } from "../../../../components/dashboard/ui-classes";

function ProposalNewFallback() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className={`${cardSurface} mx-auto max-w-3xl px-6 py-16 text-center text-sm text-zinc-500`}>
        화면을 불러오는 중…
      </div>
    </main>
  );
}

export default function NewProposalPage() {
  return (
    <PlatformPageFrame>
      <AppPageHeader
        title="제안서 작성"
        description="공고문 업로드 → 기업 정보·옵션 설정 → (추후) AI 초안 생성"
      />
      <Suspense fallback={<ProposalNewFallback />}>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <NewProposalWorkflow />
        </main>
      </Suspense>
    </PlatformPageFrame>
  );
}
