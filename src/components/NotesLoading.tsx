import { useEffect, useState } from "react";
import styled from "styled-components";
import LoaderSVG from "@/animations/Book Loader.svg?react";

const StyledWrapper = styled.div`
  .screen {
    position: relative;
    overflow: hidden;
  }

  .screen::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at top,
      hsl(var(--primary) / 0.08),
      transparent 70%
    );
  }

  .glass {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    padding: 1px;
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
    const totalDuration = 5720;
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
  return (
    <StyledWrapper>
      <div className="screen flex min-h-screen items-center justify-center bg-background px-6">
        <div className="glass w-full max-w-sm">
          <div className="glass-content">
            <div className="m-[1px] flex flex-col items-center rounded-[24px] bg-background px-10 py-12 text-center">
              <div className="flex h-[110px] w-[110px] items-center text-center justify-center">
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
    </StyledWrapper>
  );
}