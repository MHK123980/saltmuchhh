export function getAddonUnitTotal(addons) {
  return (Array.isArray(addons) ? addons : []).reduce(
    (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1),
    0
  );
}

export function getCartItemUnitPrice(item) {
  const orderQty = item.orderQuantity || 1;
  const addonsUnitTotal = getAddonUnitTotal(item.selectedAddons);
  if (item.variantPrice != null) {
    return item.variantPrice + addonsUnitTotal;
  }
  return item.unitPrice ?? item.price / orderQty;
}

export function recalculateCartItemPrice(item) {
  const orderQty = item.orderQuantity || 1;
  return getCartItemUnitPrice(item) * orderQty;
}

export function getCartItemBreakdown(item) {
  const orderQty = item.orderQuantity || 1;
  const addons = Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
  const addonsUnitTotal = getAddonUnitTotal(addons);
  const unitPrice = getCartItemUnitPrice(item);
  const variantUnitPrice = item.variantPrice ?? Math.max(0, unitPrice - addonsUnitTotal);

  return {
    variantLineTotal: variantUnitPrice * orderQty,
    addonLines: addons
      .filter((addon) => (addon.quantity || 1) >= 1)
      .map((addon) => ({
      name: addon.name,
      quantity: addon.quantity || 1,
      total: (addon.price || 0) * (addon.quantity || 1) * orderQty,
    })),
    lineTotal: item.price,
  };
}
