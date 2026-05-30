export function getAddonUnitTotal(addons) {
  return (Array.isArray(addons) ? addons : []).reduce(
    (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1),
    0
  );
}

export function getCartItemUnitPrice(item) {
  return item.variantPrice ?? item.unitPrice;
}

export function recalculateCartItemPrice(item) {
  const orderQty = item.orderQuantity || 1;
  const variantPrice = getCartItemUnitPrice(item);
  const addonsTotal = (item.selectedAddons || []).reduce((sum, addon) => {
    const qty = addon.isAbsolute ? addon.quantity : (addon.quantity || 1) * orderQty;
    return sum + (addon.price || 0) * qty;
  }, 0);
  return (variantPrice * orderQty) + addonsTotal;
}

export function getCartItemBreakdown(item) {
  const orderQty = item.orderQuantity || 1;
  const variantPrice = getCartItemUnitPrice(item);
  const addons = Array.isArray(item.selectedAddons) ? item.selectedAddons : [];

  return {
    variantLineTotal: variantPrice * orderQty,
    addonLines: addons
      .filter((addon) => {
        const qty = addon.isAbsolute ? addon.quantity : (addon.quantity || 1) * orderQty;
        return qty >= 1;
      })
      .map((addon) => {
        const qty = addon.isAbsolute ? addon.quantity : (addon.quantity || 1) * orderQty;
        return {
          name: addon.name,
          quantity: qty,
          total: (addon.price || 0) * qty,
        };
      }),
    lineTotal: recalculateCartItemPrice(item),
  };
}
