import { useRef } from 'react';
import useScrollReveal from '../../../shared/hooks/useScrollReveal.js';
import AuthDialog from '../../auth/components/AuthDialog.jsx';
import CreateLinkDialog from '../../links/components/CreateLinkDialog.jsx';
import useHome from '../hooks/useHome.js';
import HomeHeader from '../components/HomeHeader.jsx';
import HomeHero from '../components/HomeHero.jsx';
import HomeFeatures from '../components/HomeFeatures.jsx';
import HomeFooter from '../components/HomeFooter.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
export default function HomePage() {
  const model = useHome();
  const page = useRef(null);
  useScrollReveal(page);
  return (
    <div className="landing relative" ref={page}>
      <div className="landing-scene relative isolate">
        <div
          className="
      landing-art absolute z-[-2] [inset:0] bg-landing bg-cover bg-center
      max-[960px]:[background-position:62%_top] max-[600px]:bg-landing-mobile
      max-[600px]:[background-position:62%_top]
     "
          aria-hidden="true"
        />

        <HomeHeader model={model} />
        <main
          className="
      landing-main w-[min(1360px,calc(100%_-_96px))] mx-[auto] min-h-[calc(max(960px,100svh)_-_108px)]
      flex flex-col gap-(--space-28) max-[1200px]:w-[calc(100%_-_64px)] max-[960px]:min-h-auto
      max-[960px]:gap-(--space-36) max-[600px]:w-[calc(100%_-_40px)] max-[600px]:gap-(--space-32)
     "
          id="shorten"
        >
          <HomeHero model={model} />
          <HomeFeatures />
          <HomeFooter />
        </main>
      </div>
      <HowItWorks urlInput={model.urlInput} />
      <CreateLinkDialog model={model} />
      <AuthDialog
        dialog={model.dialog}
        mode={model.mode}
        setMode={model.setMode}
        pending={model.pending}
        url={model.url}
        authNotice={model.authNotice}
        setAuthNotice={model.setAuthNotice}
        onAuthenticated={model.afterLogin}
      />
    </div>
  );
}
