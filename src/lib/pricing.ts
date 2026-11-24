/**
 * Pricing helpers shared by the UI estimate and tests.
 *
 * The authoritative amount is always calculated inside the
 * `reserve_booking` SQL function. These helpers exist only to show the
 * attendee the same arithmetic before they submit.
 */
export interface ServiceFeeConfig {
  percent: number;
  minimum: number;
}

export const DEFAULT_SERVICE_FEE: ServiceFeeConfig = {
  percent: 5,
  minimum: 200,
};

export function calculateServiceFee(
  subtotalXaf: number,
  config: ServiceFeeConfig = DEFAULT_SERVICE_FEE,
): number {
  if (!Number.isFinite(subtotalXaf) || subtotalXaf <= 0) return 0;
  const percent = Number.isFinite(config.percent) ? Math.max(0, config.percent) : 0;
  const minimum = Number.isFinite(config.minimum) ? Math.max(0, config.minimum) : 0;
  return Math.max(Math.ceil((subtotalXaf * percent) / 100), Math.round(minimum));
}

export function bookingTotal(
  subtotalXaf: number,
  config: ServiceFeeConfig = DEFAULT_SERVICE_FEE,
): { subtotal: number; fee: number; total: number } {
  const subtotal = Math.max(0, Math.round(subtotalXaf));
  const fee = calculateServiceFee(subtotal, config);
  return { subtotal, fee, total: subtotal + fee };
}
