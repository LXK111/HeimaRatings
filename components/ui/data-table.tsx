interface DataTableProps {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}

export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-white/[0.08] text-xs uppercase tracking-[0.2em] text-stone-400">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-4 font-black" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row, rowIndex) => (
              <tr className="bg-iron-950/30 transition hover:bg-brass-500/5" key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td className="px-4 py-4 text-stone-200" key={`${rowIndex}-${cellIndex}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
