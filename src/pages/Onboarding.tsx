import { useState } from 'react';
import { ArrowLeft, Check, LayoutGrid, Lock, Plus } from 'lucide-react';
import { AppIcon, Logo, Segmented, Stepper } from '../components/ui';
import { haptic } from '../lib/feedback';
import { navigate } from '../lib/router';
import { useSettings, type Settings } from '../lib/settings';
import { MODULES } from '../modules/registry';

const STEPS = 5;

export function Onboarding() {
  const [s, update] = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(s.name);
  const [picked, setPicked] = useState<string[]>(s.installed);
  const [goals, setGoals] = useState({ waterGoal: s.waterGoal, caffeineLimit: s.caffeineLimit, sleepGoal: s.sleepGoal });

  const next = () => {
    haptic();
    setStep((n) => Math.min(STEPS - 1, n + 1));
  };
  const back = () => setStep((n) => Math.max(0, n - 1));
  const finish = () => {
    haptic([8, 40, 8]);
    update({
      name: name.trim(),
      installed: MODULES.map((m) => m.id).filter((id) => picked.includes(id)),
      ...goals,
      onboarded: true,
    });
    navigate('/', { replace: true });
  };
  const toggle = (id: string) => {
    haptic(6);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const goalApps = picked.filter((id) => ['water', 'caffeine', 'sleep'].includes(id));
  const firstName = name.trim();

  let body;
  let cta: { label: string; run: () => void; disabled?: boolean };
  switch (step) {
    case 0:
      body = (
        <>
          <Logo size={56} />
          <h1>LifeApp</h1>
          <p className="ob-lead">Your days, organized in one calm place.</p>
          <ul className="ob-points">
            <li>
              <span className="tile">
                <LayoutGrid size={18} />
              </span>
              <span>
                <strong>Small apps, one Home</strong>
                <span className="muted small">Tasks, habits, sleep, focus and more.</span>
              </span>
            </li>
            <li>
              <span className="tile">
                <Plus size={18} />
              </span>
              <span>
                <strong>Only what you need</strong>
                <span className="muted small">Build your Home from the Library.</span>
              </span>
            </li>
            <li>
              <span className="tile">
                <Lock size={18} />
              </span>
              <span>
                <strong>Private by design</strong>
                <span className="muted small">Everything stays on this device. No account, no cloud.</span>
              </span>
            </li>
          </ul>
        </>
      );
      cta = { label: 'Get started', run: next };
      break;
    case 1:
      body = (
        <>
          <h1>What should we call you?</h1>
          <p className="ob-lead">Used for your greeting. It never leaves this device.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <input className="ob-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus autoComplete="given-name" enterKeyHint="next" aria-label="Your name" />
          </form>
        </>
      );
      cta = { label: firstName ? 'Continue' : 'Skip', run: next };
      break;
    case 2:
      body = (
        <>
          <h1>Choose your apps</h1>
          <p className="ob-lead">Pick what goes on your Home. You can change this anytime in the Library.</p>
          <ul className="card list ob-apps">
            {MODULES.map((m) => {
              const on = picked.includes(m.id);
              return (
                <li key={m.id}>
                  <button className="ob-app" onClick={() => toggle(m.id)} role="checkbox" aria-checked={on}>
                    <AppIcon meta={m} />
                    <span className="lib-text">
                      <strong>{m.name}</strong>
                      <span className="muted small">{m.tagline}</span>
                    </span>
                    <span className={`select-dot${on ? ' on' : ''}`}>
                      <Check size={13} className="bold" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      );
      cta = { label: picked.length ? `Continue with ${picked.length}` : 'Continue', run: next };
      break;
    case 3:
      body = (
        <>
          <h1>Make it yours</h1>
          <p className="ob-lead">Pick a look and set your daily goals. Adjust them later in Settings.</p>
          <div className="card form">
            <div className="row column">
              <span className="row-label">Appearance</span>
              <Segmented<Settings['theme']>
                label="Appearance"
                value={s.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            {goalApps.includes('water') && <Stepper label="Water" unit="ml" value={goals.waterGoal} min={250} max={6000} step={250} onChange={(waterGoal) => setGoals({ ...goals, waterGoal })} />}
            {goalApps.includes('caffeine') && (
              <Stepper label="Caffeine limit" unit="mg" value={goals.caffeineLimit} min={50} max={1000} step={25} onChange={(caffeineLimit) => setGoals({ ...goals, caffeineLimit })} />
            )}
            {goalApps.includes('sleep') && <Stepper label="Sleep" unit="h" value={goals.sleepGoal} min={4} max={12} step={0.5} onChange={(sleepGoal) => setGoals({ ...goals, sleepGoal })} />}
          </div>
        </>
      );
      cta = { label: 'Continue', run: next };
      break;
    default:
      body = (
        <>
          <span className="ob-done">
            <Check size={30} className="bold" />
          </span>
          <h1>You're all set{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="ob-lead">
            {picked.length
              ? `Your Home has ${picked.length} app${picked.length === 1 ? '' : 's'}. Add more anytime from the Library.`
              : 'Your Home is empty for now. Add apps anytime from the Library.'}
          </p>
          <p className="privacy-line">
            <Lock size={13} /> Stored only on this device
          </p>
        </>
      );
      cta = { label: 'Open LifeApp', run: finish };
  }

  return (
    <div className="onboarding">
      <div className="ob-top">
        {step > 0 ? (
          <button className="icon-btn" onClick={back} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <span className="icon-btn" aria-hidden />
        )}
        <div className="ob-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step + 1} aria-label="Setup progress">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <span className="icon-btn" aria-hidden />
      </div>
      <div className={`ob-body${step === 0 || step === STEPS - 1 ? ' centered' : ''}`} key={step}>
        {body}
      </div>
      <div className="ob-footer">
        <button className="btn primary block lg" onClick={cta.run} disabled={cta.disabled}>
          {cta.label}
        </button>
      </div>
    </div>
  );
}
