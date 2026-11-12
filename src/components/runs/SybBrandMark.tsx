import {FaCrown} from 'react-icons/fa6';

export function SybBrandMark({className=''}:{className?:string}){
 return <div role="img" aria-label="SYB HOOPS — Support Your Brother" className={'flex aspect-square flex-col items-center justify-center border border-[#651923] bg-[radial-gradient(circle_at_50%_28%,#3a1218,#080708_72%)] text-[#f51f31] '+className}>
  <FaCrown aria-hidden="true" className="text-base sm:text-xl"/>
  <span className="mt-0.5 text-3xl font-black italic leading-none tracking-[-.08em]">SYB</span>
  <small className="mt-1 text-[5px] font-black uppercase tracking-[.12em] text-white sm:text-[7px]">Support Your Brother</small>
 </div>;
}
