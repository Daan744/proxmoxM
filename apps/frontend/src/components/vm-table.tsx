"use client";

export function VmTable({
  rows,
  onAction
}: {
  rows: Array<Record<string, unknown>>;
  onAction: (id: string, action: "start" | "stop" | "reboot" | "delete") => Promise<void>;
}) {
  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">VMID</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Node</th>
            <th className="px-3 py-2 text-left">Owner</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((vm) => (
            <tr key={String(vm.id)} className="border-t border-zinc-800">
              <td className="px-3 py-2">{String(vm.name)}</td>
              <td className="px-3 py-2">{String(vm.vmid)}</td>
              <td className="px-3 py-2">{String(vm.status)}</td>
              <td className="px-3 py-2">{String(vm.currentNode ?? "-")}</td>
              <td className="px-3 py-2">{String(vm.ownerUserId ?? "-")}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button className="bg-green-700 text-white" onClick={() => onAction(String(vm.id), "start")}>Start</button>
                  <button className="bg-yellow-700 text-white" onClick={() => onAction(String(vm.id), "stop")}>Stop</button>
                  <button className="bg-blue-700 text-white" onClick={() => onAction(String(vm.id), "reboot")}>Reboot</button>
                  <button className="bg-red-700 text-white" onClick={() => onAction(String(vm.id), "delete")}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
