export function getCartItemBreakdown(item) {
  const orderQty = item.orderQuantity || 1;
  const addons = Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
  const addonsUnitTotal = addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
  const unitPrice = item.unitPrice ?? item.price / orderQty;
  const variantUnitPrice = item.variantPrice ?? Math.max(0, unitPrice - addonsUnitTotal);

  return {
    variantLineTotal: variantUnitPrice * orderQty,
    addonLines: addons.map((addon) => ({
      name: addon.name,
      total: (addon.price || 0) * orderQty,
    })),
    lineTotal: item.price,
  };
}
