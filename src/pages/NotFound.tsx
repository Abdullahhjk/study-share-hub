import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import styled from "styled-components";

const StyledWrapper = styled.div`
  .screen {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background: hsl(var(--background));
  }

  .screen::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/favicon.png") center/320px no-repeat;
    opacity: 0.2;
    pointer-events: none;
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
    animation: rotateBorder 6s linear infinite;
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

  @keyframes rotateBorder {
    100% {
      transform: rotate(360deg);
    }
  }
`;

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <StyledWrapper>
      <div className="screen flex items-center justify-center px-6">
        <div className="glass w-full max-w-md">
          <div className="glass-content">
            <div className="m-[1px] rounded-[24px] bg-background px-10 py-12 text-center">
              <div className="mb-4 text-7xl font-black tracking-tight brand">
                404
              </div>

              <h1 className="text-3xl font-bold text-foreground">
                Page Not Found
              </h1>

              <p className="mt-3 text-muted-foreground">
                The page you're looking for doesn't exist or may have been
                moved.
              </p>

              <div className="mt-6 text-xs text-muted-foreground/70">
                {location.pathname}
              </div>

              <Link
                to="/"
                className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default NotFound;