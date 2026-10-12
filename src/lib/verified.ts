export type VerifiableUser = {
  password?: string | null;
  emailVerifiedAt?: Date | null;
};

/* Three states live in the same field. A Date means verified; null means the
   row was created after verification shipped and has not clicked the link; an
   absent field is a legacy account from before the feature, which stays signed
   in so nobody is locked out by a deploy. Google accounts carry no password and
   were verified by the provider. */
export function isVerified(user: VerifiableUser | null | undefined): boolean {
  if (!user) return false;
  if (user.emailVerifiedAt) return true;
  if (!user.password) return true;
  return user.emailVerifiedAt === undefined;
}
