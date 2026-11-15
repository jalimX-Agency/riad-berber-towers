import { SkeletonCard, SkeletonHeader, SkeletonPage } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage className="max-w-2xl">
      <SkeletonHeader />
      <SkeletonCard lines={5} />
    </SkeletonPage>
  );
}
