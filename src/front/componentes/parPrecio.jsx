// A Bs/USD figure pair rendered as one ticket cell: the local currency on
// top, the dollar reading beneath it — the two never appear one without the
// other.
export const ParPrecio = ({ bs, usd }) => (
  <div className='flex flex-col items-end leading-tight'>
    <span className='tabular-nums'>{bs}</span>
    <span className='tabular-nums text-[0.7rem] text-muted-foreground'>{usd} US$</span>
  </div>
);

export default ParPrecio;
