import { AppPageHeader } from "../../../components/layout/AppPageHeader";
import { PlatformPageFrame } from "../../../components/layout/PlatformPageFrame";
import { cardSurface } from "../../../components/dashboard/ui-classes";

export default function AnalysisPage() {
  return (
    <PlatformPageFrame>
      <AppPageHeader title="AI 분석" description="임베딩·FAISS·근거 인용 (설계 예정)" />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className={`${cardSurface} mx-auto max-w-2xl p-8`}>
          <p className="text-sm text-zinc-400">
            로컬 sentence-transformers 임베딩과 벡터 검색 파이프라인은 백엔드 단계에서 붙일 예정입니다. 이 화면은
            플랫폼 메뉴 구조용 플레이스홀더입니다.
          </p>
        </div>
      </main>
    </PlatformPageFrame>
  );
}
