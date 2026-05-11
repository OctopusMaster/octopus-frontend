"use client";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">System configuration</p>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        <SettingSection title="Detection Thresholds" description="Configure anomaly detection algorithm parameters">
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput label="Z-Score Threshold (σ)" defaultValue="3.0" type="number" step="0.1" />
            <LabeledInput label="IQR K-value" defaultValue="1.5" type="number" step="0.1" />
            <LabeledInput label="Moving Avg Deviation Factor" defaultValue="2.5" type="number" step="0.1" />
            <LabeledInput label="Consensus Min Methods" defaultValue="2" type="number" min="1" max="4" />
          </div>
        </SettingSection>

        <SettingSection title="Alert Escalation" description="Configure escalation timing and channels">
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput label="Escalate After (minutes)" defaultValue="15" type="number" />
            <LabeledInput label="Dedup Window (minutes)" defaultValue="5" type="number" />
          </div>
        </SettingSection>

        <SettingSection title="Notifications" description="Email and SMS configuration">
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput label="SMTP Host" defaultValue="" placeholder="smtp.example.com" />
            <LabeledInput label="From Email" defaultValue="" placeholder="alerts@example.com" />
            <LabeledInput label="Twilio From Number" defaultValue="" placeholder="+1234567890" />
          </div>
        </SettingSection>
      </div>
    </div>
  );
}

function SettingSection({
  title, description, children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {children}
      <div className="pt-2">
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          Save changes
        </button>
      </div>
    </div>
  );
}

function LabeledInput({
  label, ...props
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
