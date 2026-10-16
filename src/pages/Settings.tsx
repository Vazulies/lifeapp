import { useRef, useState } from 'react';
import { Bell, ChevronRight, Download, LayoutGrid, Lock, RotateCcw, Smartphone, Trash2, Upload, Vibrate } from 'lucide-react';
import { LargeTitle, SectionTitle, Segmented, Stepper, Switch } from '../components/ui';
import { clearAll, exportAll, importAll } from '../lib/store';
import { dateKey } from '../lib/date';
import { ask, haptic, toast } from '../lib/feedback';
import { promptInstall, useCanInstall } from '../lib/install';
import { askNotificationPermission } from '../lib/notify';
import { navigate } from '../lib/router';
import { useSettings, type Settings as SettingsT } from '../lib/settings';
import { MODULES } from '../modules/registry';

const notificationState = () => ('Notification' in window ? Notification.permission : 'unsupported');

export function Settings() {
  const [s, update] = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const canInstall = useCanInstall();
  const [notif, setNotif] = useState(notificationState);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lifeapp-backup-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup saved');
  };

  const doImport = async (file: File) => {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON');
      return;
    }
    if (!(await ask({ title: 'Restore this backup?', message: 'All current data on this device will be replaced.', confirmLabel: 'Restore', destructive: true }))) return;
    try {
      importAll(data);
      location.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not restore that backup');
    }
  };

  const erase = async () => {
    if (!(await ask({ title: 'Erase all data?', message: 'Every task, log and note on this device will be deleted. This cannot be undone.', confirmLabel: 'Erase', destructive: true }))) return;
    clearAll();
    location.reload();
  };

  return (
    <div className="page">
      <LargeTitle title="Settings" />

      <section className="card form">
        <label className="row">
          <span className="row-label">Name</span>
          <input className="inline-input" value={s.name} onChange={(e) => update({ name: e.target.value })} placeholder="Optional" />
        </label>
        <div className="row column">
          <span className="row-label">Appearance</span>
          <Segmented<SettingsT['theme']>
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
      </section>

      <SectionTitle>Daily goals</SectionTitle>
      <section className="card form">
        <Stepper label="Water" unit="ml" value={s.waterGoal} min={250} max={6000} step={250} onChange={(waterGoal) => update({ waterGoal })} />
        <Stepper label="Caffeine limit" unit="mg" value={s.caffeineLimit} min={50} max={1000} step={25} onChange={(caffeineLimit) => update({ caffeineLimit })} />
        <Stepper label="Sleep" unit="h" value={s.sleepGoal} min={4} max={12} step={0.5} onChange={(sleepGoal) => update({ sleepGoal })} />
      </section>

      <SectionTitle>General</SectionTitle>
      <section className="card form">
        <button className="row link-row" onClick={() => navigate('/library')}>
          <span className="row-label with-icon">
            <LayoutGrid size={18} /> Apps on Home
          </span>
          <span className="muted small row-end">
            {s.installed.length} of {MODULES.length} <ChevronRight size={16} />
          </span>
        </button>
        <label className="row">
          <span className="row-label with-icon">
            <Vibrate size={18} /> Haptic feedback
          </span>
          <Switch label="Haptic feedback" checked={s.haptics} onChange={(haptics) => update({ haptics })} />
        </label>
        <div className="row">
          <span className="row-label with-icon">
            <Bell size={18} /> Timer notifications
          </span>
          {notif === 'default' ? (
            <button
              className="pill"
              onClick={async () => {
                await askNotificationPermission();
                setNotif(notificationState());
              }}
            >
              Allow
            </button>
          ) : (
            <span className="muted small">{notif === 'granted' ? 'On' : notif === 'denied' ? 'Blocked in browser' : 'Not supported'}</span>
          )}
        </div>
        {canInstall && (
          <button className="row link-row" onClick={() => void promptInstall()}>
            <span className="row-label with-icon">
              <Smartphone size={18} /> Install app
            </span>
            <ChevronRight size={16} className="muted" />
          </button>
        )}
        <button
          className="row link-row"
          onClick={() => {
            haptic();
            update({ onboarded: false });
          }}
        >
          <span className="row-label with-icon">
            <RotateCcw size={18} /> Replay onboarding
          </span>
          <ChevronRight size={16} className="muted" />
        </button>
      </section>

      <SectionTitle>Data</SectionTitle>
      <section className="card stack">
        <p className="muted small with-icon">
          <Lock size={14} /> Everything is stored only on this device. Export a backup to move it elsewhere.
        </p>
        <div className="btn-row">
          <button className="btn secondary" onClick={doExport}>
            <Download size={17} /> Export
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        <button className="btn ghost danger-text block" onClick={erase}>
          <Trash2 size={17} /> Erase all data
        </button>
      </section>

      <p className="footnote">LifeApp 1.0 · No accounts · No tracking · Works offline</p>
    </div>
  );
}
