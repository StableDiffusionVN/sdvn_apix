/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface SearchableSelectProps {
    id: string;
    label: string;
    options: string[];
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ id, label, options, value, onChange, placeholder }) => {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // On blur, commit the current input value to the parent state
                onChange(inputValue); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, onChange]);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleSelectOption = (option: string) => {
        onChange(option);
        setInputValue(option);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                handleSelectOption(filteredOptions[highlightedIndex]);
            } else {
                 onChange(inputValue);
                 setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setHighlightedIndex(-1);
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className="searchable-dropdown-container">
            <label htmlFor={id} className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                {label}
            </label>
            <input
                ref={inputRef}
                type="text"
                id={id}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => {
                    // We use mousedown listener for closing, but keep onBlur to commit final typed value
                    onChange(inputValue);
                }}
                onKeyDown={handleKeyDown}
                className="form-input"
                placeholder={placeholder || "Để trống để chọn Tự động..."}
                autoComplete="off"
            />
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="searchable-dropdown-list"
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, index) => (
                                <li
                                    key={opt}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent input blur
                                        handleSelectOption(opt);
                                    }}
                                    className={cn("searchable-dropdown-item", { 'is-highlighted': index === highlightedIndex })}
                                >
                                    {opt}
                                </li>
                            ))
                        ) : (
                            <li className="searchable-dropdown-item !cursor-default">Không tìm thấy</li>
                        )}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};
