import { Hero } from "@/components/marketing/hero";
import {
  Closing,
  Features,
  Industries,
  Numbers,
  Showcase,
} from "@/components/marketing/sections";

/**
 * The landing page reads top to bottom as one argument: here is the problem
 * (hero), here is the machine (showcase), here is what it does that a
 * spreadsheet cannot (features), here is the proof (numbers), here is who it
 * is for (industries), now come in (closing).
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <Showcase />
      <Features />
      <Numbers />
      <Industries />
      <Closing />
    </>
  );
}
