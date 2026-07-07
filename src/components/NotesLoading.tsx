import { useEffect, useState } from "react";
import styled from "styled-components";
import LoaderSVG from "@/animations/Book Loader.svg?react";

const StyledWrapper = styled.div`
.screen {
  min-height: 100vh;
  position: relative;
  background: hsl(var(--background));
}

.screen::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 32;

  background: url("/favicon.png") center center / 180px 320px
    no-repeat;

  opacity: 0.15;
}

.screen::after {
  content: "";
  position: absolute;
  inset: 0;

  background: radial-gradient(
    circle at top,
    hsl(var(--primary) / 0.08),
    transparent 70%
  );

  pointer-events: none;
}

.glass {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 1px;
  z-index: 10;
}

.glass::before {
  content: "";
  position: absolute;
  inset: -120%;
  background: conic-gradient(
    from 0deg,
    transparent,
    white,
    hsl(var(--primary)),
    hsl(195 100% 65%),
    cyan,
    transparent,
    white,
    hsl(var(--primary)),
    hsl(195 100% 65%),
    cyan,
    transparent
  );
  animation: rotateBorder 5s linear infinite;
}

.glass::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: 23px;
  background: hsl(var(--card) / 0.9);
  backdrop-filter: blur(18px);
  border: 1px solid hsl(var(--primary) / 0.3);
  z-index: 1;
}

.glass-content {
  position: relative;
  z-index: 2;
}

.brand {
  background: linear-gradient(
    to right,
    hsl(var(--primary)),
    hsl(195 100% 65%)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.progress {
  width: 180px;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
  position: relative;
}

.progress::before {
  content: "";
  position: absolute;
  inset: 0;
  width: 45%;
  background: linear-gradient(
    to right,
    hsl(var(--primary)),
    hsl(195 100% 65%)
  );
  animation: load 1.1s ease-in-out infinite;
}

.welcome-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 14px;
  background: hsl(var(--background) / 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--primary) / 0.15);
  box-shadow:
    0 4px 20px hsl(var(--primary) / 0.08),
    inset 0 1px 0 hsl(0 0% 100% / 0.08);
  animation: fadeSlideIn 0.6s ease;
  z-index: 100;
}

.welcome-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.welcome-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  background: linear-gradient(
    to right,
    hsl(var(--primary)),
    hsl(195 100% 65%)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

svg {
  filter: none !important;
  drop-shadow: none !important;
}

@keyframes load {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}

@keyframes rotateBorder {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

function LoadingSteps() {
  const steps = [
    "Preparing things...",
    "Loading content...",
    "Syncing data...",
    "Almost ready...",
    "Finalizing...",
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const totalDuration = 6720;
    const stepDuration = totalDuration / steps.length;

    const interval = setInterval(() => {
      setCurrentStep((prev) =>
        prev < steps.length - 1 ? prev + 1 : prev
      );
    }, stepDuration);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="relative mt-2 h-[20px] w-full text-sm text-muted-foreground">
      {steps.map((step, idx) => (
        <p
          key={step}
          className={`absolute left-1/2 top-0 -translate-x-1/2 transition-opacity duration-300 ${idx === currentStep ? "opacity-100" : "opacity-0"
            }`}
        >
          {step}
        </p>
      ))}
    </div>
  );
}

export default function NotesLoading() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("cred");

    if (user) {
      const parsed = JSON.parse(user);
      setName(parsed.name || "");
      setEmail(parsed.email || "");
    }
  }, []);

  const displayName = name || email || "User";

  return (
    <StyledWrapper>
      <div className="screen flex min-h-screen items-center justify-center px-6">
        <div className="relative">
          {(name || email) && (
            <div className="absolute left-1/2 bottom-full mb-8 -translate-x-1/2 text-center whitespace-nowrap">
              <p className="text-sm font-medium text-muted-foreground">
                Welcome back,
              </p>

              <h2 className="mt-1 text-3xl font-bold tracking-tight">
                <span className="brand">{displayName}</span>
              </h2>
            </div>
          )}

          <div className="relative z-10 glass w-full max-w-sm">
            <div className="glass-content">
              <div className="m-[1px] flex flex-col items-center rounded-[24px] bg-background px-10 py-12 text-center">
                <div className="flex h-[110px] w-[110px] items-center justify-center">
                  <LoaderSVG className="h-full w-full" />
                </div>

                <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground">
                  Scholar <span className="brand">Share</span>
                </h1>

                <LoadingSteps />

                <div className="mt-6">
                  <div className="progress" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}