import React, { useState, useRef, useEffect } from 'react';

interface ShuffleTextProps {
  text: string;
  className?: string;
}

const CHARS = '!<>-_\\/[]{}—=+*^?#________';

const ShuffleText: React.FC<ShuffleTextProps> = ({ text, className }) => {
  const [displayedText, setDisplayedText] = useState(text);
  const intervalRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const scramble = () => {
    let iteration = 0;
    
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
        setDisplayedText(prev => 
            prev.split("").map((_, index) => {
                if(index < iteration) {
                    return text[index];
                }
                
                return CHARS[Math.floor(Math.random() * CHARS.length)];
            }).join("")
        );
      
      if(iteration >= text.length){ 
        if (intervalRef.current) clearInterval(intervalRef.current);
        isAnimatingRef.current = false;
      }
      
      iteration += 1 / 3;
    }, 30);
  };
  
  const handleMouseOver = () => {
    if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        scramble();
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <span onMouseOver={handleMouseOver} className={className}>
        {displayedText}
    </span>
  );
};

export default ShuffleText;
