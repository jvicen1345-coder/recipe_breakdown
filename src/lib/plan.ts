export const FREE_RECIPE_LIMIT = 10;
export const FREE_FOLDER_LIMIT = 2;

export const PRO_PRICE_MONTHLY_USD = 4.99;
export const PRO_PRICE_YEARLY_USD = 29.99;

export function isPro(user: { plan: string }): boolean {
  return user.plan === "pro";
}
