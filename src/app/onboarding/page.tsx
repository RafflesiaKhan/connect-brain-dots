import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BrainDots } from "@/components/BrainDots";
import { Logo } from "@/components/ui";
import { getAiSettingsView } from "@/lib/ai/providers";
import { getProfile } from "@/lib/session";
import { Wizard } from "./Wizard";

export default async function OnboardingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const [profile, ai] = await Promise.all([getProfile(userId), getAiSettingsView(userId)]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BrainDots density={0.00005} />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Logo />
        <Wizard
          initialName={profile?.displayName || session.user?.name || ""}
          initialAvatar={profile?.avatar ?? null}
          initialType={profile?.profileType ?? "personal"}
          initialAnswers={profile?.answers ?? {}}
          ai={ai}
          editing={!!profile?.onboarded}
        />
      </div>
    </div>
  );
}
