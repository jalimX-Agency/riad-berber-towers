import { Bone, SkeletonHeader, SkeletonPage } from "@/components/admin/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <div className="overflow-hidden rounded-[10px] border border-rule bg-snow">
        <div className="grid min-w-[700px] gap-px" style={{ gridTemplateColumns: "150px repeat(14, minmax(34px, 1fr))" }}>
          {Array.from({ length: 8 * 15 }, (_, i) => (
            <div key={i} className="border-b border-rule/60 p-2">
              <Bone className={i % 15 === 0 ? "h-5 w-24" : "h-5 w-full opacity-60"} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
