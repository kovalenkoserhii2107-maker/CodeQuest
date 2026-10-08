export const NETWORK_STRATEGY = String.raw`
export function main(cq) {
  const reserve = 100;
  for (const [siteId, product, buyerId] of [["port","parts","harbor-parts"],["highlands","circuit","northern-circuit"]]) {
    const buyer = cq.market.getBuyers(product).find(b => b.id === buyerId);
    const amount = Math.min(cq.network.getSite(siteId).inventory[product], buyer.demand);
    if (amount > 0 && cq.network.quoteTrade(siteId,product,amount,buyerId).canTrade) cq.network.sell(siteId,product,amount,buyerId);
  }
  const city = cq.network.getSite("city");
  if (!city.lines[0].job) {
    const supplier = cq.market.getSuppliers().find(s => s.id === "yard");
    const missing = Math.max(0,16-city.inventory.scrap);
    if (supplier.stock >= missing && city.freeSpace >= missing && cq.world.getState().balance >= missing*supplier.price+16+reserve) {
      if (missing > 0) cq.network.buy("city","scrap",missing,supplier.id);
      const q = cq.network.quoteProduction("city","metal",8);
      if (q.canStart) cq.network.start("city","metal",8);
    }
  }
  const port = cq.network.getSite("port");
  const inbound = cq.network.getTransfers().filter(t => t.status === "transit" && t.to === "port" && t.product === "metal").reduce((sum,t) => sum+t.quantity,0);
  const ship = Math.min(8,Math.max(0,16-port.inventory.metal-inbound),cq.network.getSite("city").inventory.metal);
  if (ship > 0) {
    const q = cq.network.quoteTransfer("metal",ship,"city","port");
    if (q.canDispatch && cq.world.getState().balance >= q.fee+reserve) cq.network.transfer("metal",ship,"city","port");
  }
  const parts = Math.min(4,Math.floor(port.inventory.metal/2));
  if (parts > 0 && !port.lines[0].job) {
    const q = cq.network.quoteProduction("port","parts",parts);
    if (q.canStart && cq.world.getState().balance >= q.energyCost+reserve) cq.network.start("port","parts",parts);
  }
  const north = cq.network.getSite("highlands");
  if (!north.lines[0].job) {
    if (north.inventory.wire >= 6) {
      const q = cq.network.quoteProduction("highlands","circuit",2);
      if (q.canStart && cq.world.getState().balance >= q.energyCost+reserve) cq.network.start("highlands","circuit",2);
    } else {
      const supplier = cq.market.getSuppliers().find(s => s.id === "northern-metal");
      const missing = Math.max(0,6-north.inventory.metal);
      if (supplier.stock >= missing && north.freeSpace >= missing && cq.world.getState().balance >= missing*supplier.price+18+reserve) {
        if (missing > 0) cq.network.buy("highlands","metal",missing,supplier.id);
        const q = cq.network.quoteProduction("highlands","wire",6);
        if (q.canStart) cq.network.start("highlands","wire",6);
      }
    }
  }
  console.log("Network tick",cq.world.getTime(),cq.network.getSites().map(s => [s.id,s.busyLines,s.inventoryTotal]));
}
`;
