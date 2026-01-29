import ClientDiffViewer from "./viewer";

export default async function DiffPage(contextPromise) {
  console.log("🔥 DiffPage 실행됨");
  
  const context = await contextPromise;               // 1차 언래핑
  console.log("🔥 받은 context:", context);

  const params = await context.params;                // 2차 언래핑
  const id = params?.id;

  console.log("🔥 최종 추출된 id:", id);

  return <ClientDiffViewer id={id} />;
}
