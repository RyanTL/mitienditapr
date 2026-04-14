"use client";

/**
 * Shared step UI chrome for vendor onboarding and ATH checkout wizard.
 * Keep keyframes and bar markup identical across flows.
 */

export const ONBOARDING_STEP_ANIMATIONS_CSS = `
@keyframes onb-slide{from{opacity:0;transform:translateX(var(--dx,50px))}to{opacity:1;transform:translateX(0)}}
@keyframes onb-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-hero{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
.onb-in{animation:onb-slide .5s cubic-bezier(.16,1,.3,1) both}
.ob1{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .05s both}
.ob2{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .1s both}
.ob3{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .16s both}
.ob4{animation:onb-up .55s cubic-bezier(.16,1,.3,1) .22s both}
.obh{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) both}
.obh1{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) .08s both}
.obh2{animation:onb-hero .7s cubic-bezier(.16,1,.3,1) .16s both}
`;

export function OnboardingSegmentedBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-all duration-500 ease-out ${
            i < step ? "h-[3px] bg-black" : "h-[2px] bg-[#e5e5ea]"
          }`}
        />
      ))}
    </div>
  );
}
