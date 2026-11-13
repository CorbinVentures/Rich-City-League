import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { BmfChampionshipInterestForm } from '@/components/runs/BmfChampionshipInterestForm';

export const metadata:Metadata={title:'Register Interest | BMF Championship',description:'Register interest for Rich City Hoops Runs BMF Championship updates.',robots:{index:false,follow:false}};

export default function RegisterBmfInterestPage(){return <main className="min-h-screen bg-[#090909] pb-20 text-white"><Container maxWidth="md" className="py-10 sm:py-16"><Link href="/runs/bmf-championship" className="inline-flex min-h-11 items-center text-xs font-black uppercase text-white/65">← BMF Championship</Link><p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-[#a7a7a7]">Rich City Hoops Runs</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-6xl">BMF Championship</h1><p className="mt-3 mb-8 max-w-2xl text-sm leading-6 text-white/65">January 2, 2027 · Richmond, VA · venue pending. Register your interest to receive official entry details.</p><BmfChampionshipInterestForm/></Container></main>;}
