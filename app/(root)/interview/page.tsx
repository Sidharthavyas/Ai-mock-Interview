// app/(root)/interview/page.tsx
import Agent from "@/components/Agent";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  if (!user) {
    return <div>Please sign in to access this page</div>;
  }

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={user.name!}
        userId={user.id}
        profileImage={user.image}
        type="generate"
      />
    </>
  );
};

export default Page;