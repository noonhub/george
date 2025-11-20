import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="text-center p-6 border-b border-white/5 bg-[#111214]/50 backdrop-blur-sm">
      <h1 className="text-4xl font-semibold tracking-tight text-[#247feb]">Curious George Q-Learns</h1>
      <p className="text-gray-400 mt-3 max-w-3xl mx-auto leading-relaxed">
        Build a tiny neighborhood for George: start at home, finish chores, maybe play a bit, and reach the ice cream store before bedtime. Tweak bedtime, energy, chores, and fun to see the path he learns.
      </p>
    </div>
  );
};

export default Header;
