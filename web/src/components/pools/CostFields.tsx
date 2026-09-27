type Props = {
  mode: string;
  cost: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

export default function CostFields({ mode, cost, onChange }: Props) {
  return (
    <div>
      <label>
        <span>Cost per person</span>
        <select id="pricing_mode" name="pricing_mode" value={mode} onChange={onChange}>
          <option value="fixed">Fixed amount (₹)</option>
          <option value="split_equally">Split equally</option>
        </select>
      </label>
      {mode === "split_equally" ? (
        <p className="helper" style={{ marginTop: 8 }}>The final fare is shared equally by everyone travelling, including the host. Agree on the amount after the trip.</p>
      ) : (
        <label style={{ marginTop: 8 }}>
          <span>Amount per person (₹)</span>
          <input id="cost_per_person" name="cost_per_person" type="number" min="0" max="10000" step="0.01" required value={cost} onChange={onChange} />
        </label>
      )}
    </div>
  );
}
