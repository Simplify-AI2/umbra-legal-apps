import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Import mammoth for .docx files
import mammoth from 'mammoth';

// Set worker source
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ContractReview = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [aiReviewContent, setAiReviewContent] = useState(null);
  const aiReviewRef = useRef(null);
  const [originalPdfText, setOriginalPdfText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Function to generate unique 50-character random string
  const generateContractReviewId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 50; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  useEffect(() => {
    // Add custom CSS to hide "Powered by Flowise" text
    const style = document.createElement('style');
    style.textContent = `
      .flowise-powered-by {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Load the chatbot script
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
      Chatbot.init({
        chatflowid: "29de46a3-2f2f-4bf5-ad8d-9c6b7c24f355",
        apiHost: "https://workflow.simplifygenai.id/",
        theme: {
          chatWindow: {
            showTitle: true,
            showAgentMessages: true,
            title: 'Simplify AI',
            welcomeMessage: 'Hello!',
            errorMessage: 'Error...',
            backgroundColor: '#ffffff',
            height: 500,
            width: 400,
            fontSize: 16,
            clearChatOnReload: false, // If set to true, the chat will be cleared when the page reloads
            sourceDocsTitle: 'Sources:',
            renderHTML: true,
            footer: {
              textColor: '#303235',
              text: 'Powered by',
              company: 'Simplify AI',
              companyLink: 'https://simplifyai.com',
            },
          },
        },
      })
    `;
    document.body.appendChild(script);

    // Cleanup function to remove the script and style when component unmounts
    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Function to extract text from PDF
  const extractTextFromPDF = async (arrayBuffer) => {
    const pdf = await getDocument(arrayBuffer).promise;
    const numPages = pdf.numPages;
    let pdfText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      pdfText += pageText + '\n';
    }

    return pdfText;
  };

  // Function to extract text from .docx
  const extractTextFromDocx = async (arrayBuffer) => {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from .docx:', error);
      throw new Error('Failed to extract text from Word document');
    }
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    // Check if file is PDF or .docx
    const isPDF = selectedFile.type === 'application/pdf';
    const isDocx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   selectedFile.name.toLowerCase().endsWith('.docx');

    if (!isPDF && !isDocx) {
      alert('Please select a PDF or Word (.docx) file.');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          let documentText = '';

          // Extract text based on file type
          if (isPDF) {
            documentText = await extractTextFromPDF(arrayBuffer);
          } else if (isDocx) {
            documentText = await extractTextFromDocx(arrayBuffer);
          }

          console.log('Extracted Document Text:', documentText);

          //const flowiseUrl = 'https://workflows.ximplify.id/api/v1/prediction/0804fd86-1861-460c-afb1-c5761b646d62';
          // const flowiseUrl = 'https://workflows.ximplify.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          //const flowiseUrl = 'https://genai.ximplify.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';

          //const flowiseUrl = 'https://workflows.ximplify.id/v2/agentcanvas/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          //const flowiseUrl = 'https://genai.ximplify.id/v2/agentcanvas/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';

          const response = await fetch(flowiseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: "Please summarize this contract.",
              chatId: "session-client-side-ui", // unik per pengguna/sesi
              uploads: [
                {
                  type: "file:full",
                  name: selectedFile.name,
                  data: documentText,  // ⚠️ pastikan sudah truncated jika panjang
                  mime: isPDF ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Flowise Agent Response:', result);

          if (result && result.text) {
            // Set AI review content for display in AI Review card
            setAiReviewContent(result.text);
            
            // Add to review history with the API response
            const newReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Completed',
              reviewer: 'AI Assistant',
              summary: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
              fullReview: result.text
            };
            setReviewHistory([newReview, ...reviewHistory]);
          } else {
            // Set error message for AI Review card
            setAiReviewContent('Could not retrieve review from agent.');
            
            // Add error entry to review history
            const errorReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Failed',
              reviewer: 'AI Assistant',
              summary: 'Could not retrieve review from agent.',
              fullReview: 'Error: Could not process the contract review.'
            };
            setReviewHistory([errorReview, ...reviewHistory]);
          }
        } catch (error) {
          console.error('Error processing document or sending to agent:', error);
          alert('Error processing document or sending to agent.');
          
          // Set error message for AI Review card
          setAiReviewContent('Error: Could not process the contract review.');
          
          // Add error entry to review history
          const errorReview = {
            id: reviewHistory.length + 1,
            contractName: selectedFile.name,
            reviewDate: new Date().toISOString().split('T')[0],
            status: 'Failed',
            reviewer: 'AI Assistant',
            summary: 'Review failed due to API error',
            fullReview: 'Error: Could not process the contract review.'
          };
          setReviewHistory([errorReview, ...reviewHistory]);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error in file upload:', error);
      alert('Error in file upload.');
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge bg="success">{status}</Badge>;
      case 'Pending':
        return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'In Progress':
        return <Badge bg="info">{status}</Badge>;
      case 'Failed':
        return <Badge bg="danger">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // useEffect to add checkboxes after content is rendered
  useEffect(() => {
    if (aiReviewContent && aiReviewRef.current) {
      console.log('AI Review content updated, starting checkbox addition process...');
      
      // Function to force add checkboxes to ANY table that might be amendments
      const forceAddCheckboxes = () => {
        const container = aiReviewRef.current;
        if (!container) {
          console.log('Container not found');
          return false;
        }

        console.log('Searching for tables in container...');
        const allTables = container.querySelectorAll('table');
        console.log(`Found ${allTables.length} tables total`);

        let checkboxesAdded = false;

        allTables.forEach((table, tableIndex) => {
          console.log(`Checking table ${tableIndex + 1}:`, table.textContent.substring(0, 100));
          
          // Check if this table is specifically table B) "Recommended Legal Amendments and Clause Revisions"
          const tableText = table.textContent.toLowerCase();
          
          // More flexible detection for table B) - look for various ways the AI might format it
          const isTableB = (
            // Look for table B) with various title formats
            (tableText.includes('b)') || tableText.includes('table b') || tableText.includes('table b)')) &&
            // And look for amendments/revisions content
            (tableText.includes('amendment') || tableText.includes('revision') || tableText.includes('clause'))
          ) ||
          // Alternative: look for the full title in various formats
          tableText.includes('recommended legal amendments and clause revisions') ||
          tableText.includes('recommended amendments and clause revisions') ||
          tableText.includes('legal amendments and revisions');
          
          console.log(`Table ${tableIndex + 1} text preview:`, tableText.substring(0, 200));
          console.log(`Table ${tableIndex + 1} contains 'b)':`, tableText.includes('b)'));
          console.log(`Table ${tableIndex + 1} contains amendment/revision:`, tableText.includes('amendment') || tableText.includes('revision'));
          
          if (isTableB) {
            console.log(`Table ${tableIndex + 1} is confirmed as table B) - adding checkboxes...`);
            
            // Force add header if it doesn't exist
            let headerRow = table.querySelector('thead tr');
            if (!headerRow) {
              console.log('No thead found, creating one...');
              const thead = document.createElement('thead');
              headerRow = document.createElement('tr');
              thead.appendChild(headerRow);
              table.insertBefore(thead, table.firstChild);
            }
            
            // Add Select header
            const existingSelectHeader = headerRow.querySelector('th:last-child');
            if (!existingSelectHeader || !existingSelectHeader.textContent.includes('Select')) {
              const selectHeader = document.createElement('th');
              selectHeader.textContent = 'Select';
              selectHeader.style.textAlign = 'center';
              selectHeader.style.width = '80px';
              selectHeader.style.backgroundColor = '#f8f9fa';
              selectHeader.style.border = '1px solid #dee2e6';
              selectHeader.style.padding = '8px';
              headerRow.appendChild(selectHeader);
              console.log('Added Select header to table B)');
            }
            
            // Add checkboxes to all rows
            const allRows = table.querySelectorAll('tr');
            console.log(`Found ${allRows.length} total rows in table B)`);
            
            allRows.forEach((row, rowIndex) => {
              // Skip header row
              if (row.parentElement.tagName === 'THEAD') {
                return;
              }
              
              // Check if row already has checkbox
              const existingCheckbox = row.querySelector('input[type="checkbox"]');
              if (!existingCheckbox) {
                // Create new cell with checkbox
                const checkboxCell = document.createElement('td');
                checkboxCell.style.textAlign = 'center';
                checkboxCell.style.verticalAlign = 'middle';
                checkboxCell.style.border = '1px solid #dee2e6';
                checkboxCell.style.padding = '8px';
                checkboxCell.style.backgroundColor = '#ffffff';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.width = '18px';
                checkbox.style.height = '18px';
                checkbox.style.cursor = 'pointer';
                checkbox.id = `checkbox-tableB-row-${rowIndex}`;
                checkbox.onclick = (e) => {
                  console.log(`Checkbox clicked: ${checkbox.id}`);
                  e.stopPropagation();
                };
                checkbox.onchange = (e) => {
                  const isChecked = e.target.checked;
                  console.log(`Checkbox ${checkbox.id} changed to: ${isChecked}`);
                  
                  // Find the "Input Verification of Amendments" column in this row
                  const cells = row.querySelectorAll('td');
                  let verificationCell = null;
                  
                  // First try to find by header text
                  const table = row.closest('table');
                  const headerRow = table.querySelector('thead tr');
                  if (headerRow) {
                    const headerCells = headerRow.querySelectorAll('th');
                    let verificationColumnIndex = -1;
                    
                    headerCells.forEach((headerCell, index) => {
                      const headerText = headerCell.textContent.toLowerCase();
                      if (headerText.includes('input verification') || 
                          headerText.includes('verification of amendments') ||
                          headerText.includes('verification')) {
                        verificationColumnIndex = index;
                        console.log(`Found verification column at index ${index}: "${headerCell.textContent}"`);
                      }
                    });
                    
                    if (verificationColumnIndex >= 0 && cells[verificationColumnIndex]) {
                      verificationCell = cells[verificationColumnIndex];
                    }
                  }
                  
                  // Fallback: look for cell content
                  if (!verificationCell) {
                    cells.forEach(cell => {
                      if (cell.textContent.toLowerCase().includes('input verification') || 
                          cell.textContent.toLowerCase().includes('verification')) {
                        verificationCell = cell;
                      }
                    });
                  }
                  
                  if (verificationCell) {
                    if (isChecked) {
                      // Find the "Revised Clause (Formal Legal Language)" column to get default text
                      let defaultText = '';
                      const headerRow = table.querySelector('thead tr');
                      if (headerRow) {
                        const headerCells = headerRow.querySelectorAll('th');
                        let revisedClauseColumnIndex = -1;
                        
                        headerCells.forEach((headerCell, index) => {
                          const headerText = headerCell.textContent.toLowerCase();
                          if (headerText.includes('revised clause') || 
                              headerText.includes('formal legal language') ||
                              headerText.includes('recommended amendment')) {
                            revisedClauseColumnIndex = index;
                            console.log(`Found revised clause column at index ${index}: "${headerCell.textContent}"`);
                          }
                        });
                        
                        if (revisedClauseColumnIndex >= 0 && cells[revisedClauseColumnIndex]) {
                          defaultText = cells[revisedClauseColumnIndex].textContent.trim();
                          console.log(`Default text from revised clause column: "${defaultText.substring(0, 100)}..."`);
                        }
                      }
                      
                      // Create textarea when checkbox is checked
                      const textarea = document.createElement('textarea');
                      textarea.placeholder = 'Enter verification notes...';
                      textarea.value = defaultText; // Set default text from revised clause column
                      textarea.style.width = '100%';
                      textarea.style.minHeight = '60px';
                      textarea.style.height = 'auto'; // Start with auto height
                      textarea.style.padding = '4px';
                      textarea.style.border = '1px solid #ccc';
                      textarea.style.borderRadius = '4px';
                      textarea.style.fontSize = '12px';
                      textarea.style.resize = 'vertical'; // Allow vertical resizing
                      textarea.style.overflowY = 'auto'; // Show scrollbar if needed
                      textarea.id = `textarea-${checkbox.id}`;
                      
                      // Auto-resize textarea to fit content
                      const autoResize = () => {
                        textarea.style.height = 'auto';
                        const scrollHeight = textarea.scrollHeight;
                        const maxHeight = Math.max(200, scrollHeight); // Minimum 200px, or content height
                        textarea.style.height = `${maxHeight}px`;
                      };
                      
                      // Set initial height after content is loaded
                      setTimeout(autoResize, 10);
                      
                      // Auto-resize on input
                      textarea.addEventListener('input', autoResize);
                      
                      // Clear existing content and add textarea
                      verificationCell.innerHTML = '';
                      verificationCell.appendChild(textarea);
                      textarea.focus();
                      
                      console.log(`Added textarea to verification cell for row ${rowIndex + 1} with default text`);
                    } else {
                      // Remove textarea when checkbox is unchecked
                      const existingTextarea = verificationCell.querySelector('textarea');
                      if (existingTextarea) {
                        verificationCell.innerHTML = '';
                        console.log(`Removed textarea from verification cell for row ${rowIndex + 1}`);
                      }
                    }
                  } else {
                    console.log(`Could not find verification cell in row ${rowIndex + 1}`);
                    console.log('Available cells:', Array.from(cells).map(cell => cell.textContent.substring(0, 50)));
                  }
                };
                
                checkboxCell.appendChild(checkbox);
                row.appendChild(checkboxCell);
                checkboxesAdded = true;
                console.log(`Added checkbox to row ${rowIndex + 1} in table B)`);
              }
            });
          } else {
            console.log(`Table ${tableIndex + 1} is NOT table B) - skipping checkbox addition`);
            
            // Fallback: if we haven't found table B) yet and this table looks like it could be it
            if (!checkboxesAdded && tableIndex > 0) { // Skip first table (likely table A)
              const fallbackCheck = (tableText.includes('amendment') || 
                                   tableText.includes('revision') || 
                                   tableText.includes('clause') ||
                                   tableText.includes('recommended')) &&
                                   // Exclude table C) "Redundancy Check"
                                   !tableText.includes('redundancy') &&
                                   !tableText.includes('c)') &&
                                   !tableText.includes('table c');
              
              if (fallbackCheck) {
                console.log(`Fallback: Table ${tableIndex + 1} might be table B) - adding checkboxes anyway...`);
                
                // Force add header if it doesn't exist
                let headerRow = table.querySelector('thead tr');
                if (!headerRow) {
                  console.log('No thead found, creating one...');
                  const thead = document.createElement('thead');
                  headerRow = document.createElement('tr');
                  thead.appendChild(headerRow);
                  table.insertBefore(thead, table.firstChild);
                }
                
                // Add Select header
                const existingSelectHeader = headerRow.querySelector('th:last-child');
                if (!existingSelectHeader || !existingSelectHeader.textContent.includes('Select')) {
                  const selectHeader = document.createElement('th');
                  selectHeader.textContent = 'Select';
                  selectHeader.style.textAlign = 'center';
                  selectHeader.style.width = '80px';
                  selectHeader.style.backgroundColor = '#f8f9fa';
                  selectHeader.style.border = '1px solid #dee2e6';
                  selectHeader.style.padding = '8px';
                  headerRow.appendChild(selectHeader);
                  console.log('Added Select header to fallback table');
                }
                
                // Add checkboxes to all rows
                const allRows = table.querySelectorAll('tr');
                console.log(`Found ${allRows.length} total rows in fallback table`);
                
                allRows.forEach((row, rowIndex) => {
                  // Skip header row
                  if (row.parentElement.tagName === 'THEAD') {
                    return;
                  }
                  
                  // Check if row already has checkbox
                  const existingCheckbox = row.querySelector('input[type="checkbox"]');
                  if (!existingCheckbox) {
                    // Create new cell with checkbox
                    const checkboxCell = document.createElement('td');
                    checkboxCell.style.textAlign = 'center';
                    checkboxCell.style.verticalAlign = 'middle';
                    checkboxCell.style.border = '1px solid #dee2e6';
                    checkboxCell.style.padding = '8px';
                    checkboxCell.style.backgroundColor = '#ffffff';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.style.width = '18px';
                    checkbox.style.height = '18px';
                    checkbox.style.cursor = 'pointer';
                    checkbox.id = `checkbox-fallback-row-${rowIndex}`;
                    checkbox.onclick = (e) => {
                      console.log(`Checkbox clicked: ${checkbox.id}`);
                      e.stopPropagation();
                    };
                    checkbox.onchange = (e) => {
                      const isChecked = e.target.checked;
                      console.log(`Fallback checkbox ${checkbox.id} changed to: ${isChecked}`);
                      
                      // Find the "Input Verification of Amendments" column in this row
                      const cells = row.querySelectorAll('td');
                      let verificationCell = null;
                      
                      // First try to find by header text
                      const table = row.closest('table');
                      const headerRow = table.querySelector('thead tr');
                      if (headerRow) {
                        const headerCells = headerRow.querySelectorAll('th');
                        let verificationColumnIndex = -1;
                        
                        headerCells.forEach((headerCell, index) => {
                          const headerText = headerCell.textContent.toLowerCase();
                          if (headerText.includes('input verification') || 
                              headerText.includes('verification of amendments') ||
                              headerText.includes('verification')) {
                            verificationColumnIndex = index;
                            console.log(`Found verification column at index ${index}: "${headerCell.textContent}"`);
                          }
                        });
                        
                        if (verificationColumnIndex >= 0 && cells[verificationColumnIndex]) {
                          verificationCell = cells[verificationColumnIndex];
                        }
                      }
                      
                      // Fallback: look for cell content
                      if (!verificationCell) {
                        cells.forEach(cell => {
                          if (cell.textContent.toLowerCase().includes('input verification') || 
                              cell.textContent.toLowerCase().includes('verification')) {
                            verificationCell = cell;
                          }
                        });
                      }
                      
                      if (verificationCell) {
                        if (isChecked) {
                          // Find the "Revised Clause (Formal Legal Language)" column to get default text
                          let defaultText = '';
                          const headerRow = table.querySelector('thead tr');
                          if (headerRow) {
                            const headerCells = headerRow.querySelectorAll('th');
                            let revisedClauseColumnIndex = -1;
                            
                            headerCells.forEach((headerCell, index) => {
                              const headerText = headerCell.textContent.toLowerCase();
                              if (headerText.includes('revised clause') || 
                                  headerText.includes('formal legal language') ||
                                  headerText.includes('recommended amendment')) {
                                revisedClauseColumnIndex = index;
                                console.log(`Found revised clause column at index ${index}: "${headerCell.textContent}"`);
                              }
                            });
                            
                            if (revisedClauseColumnIndex >= 0 && cells[revisedClauseColumnIndex]) {
                              defaultText = cells[revisedClauseColumnIndex].textContent.trim();
                              console.log(`Default text from revised clause column: "${defaultText.substring(0, 100)}..."`);
                            }
                          }
                          
                          // Create textarea when checkbox is checked
                          const textarea = document.createElement('textarea');
                          textarea.placeholder = 'Enter verification notes...';
                          textarea.value = defaultText; // Set default text from revised clause column
                          textarea.style.width = '100%';
                          textarea.style.minHeight = '60px';
                          textarea.style.height = 'auto'; // Start with auto height
                          textarea.style.padding = '4px';
                          textarea.style.border = '1px solid #ccc';
                          textarea.style.borderRadius = '4px';
                          textarea.style.fontSize = '12px';
                          textarea.style.resize = 'vertical'; // Allow vertical resizing
                          textarea.style.overflowY = 'auto'; // Show scrollbar if needed
                          textarea.id = `textarea-${checkbox.id}`;
                          
                          // Auto-resize textarea to fit content
                          const autoResize = () => {
                            textarea.style.height = 'auto';
                            const scrollHeight = textarea.scrollHeight;
                            const maxHeight = Math.max(200, scrollHeight); // Minimum 200px, or content height
                            textarea.style.height = `${maxHeight}px`;
                          };
                          
                          // Set initial height after content is loaded
                          setTimeout(autoResize, 10);
                          
                          // Auto-resize on input
                          textarea.addEventListener('input', autoResize);
                          
                          // Clear existing content and add textarea
                          verificationCell.innerHTML = '';
                          verificationCell.appendChild(textarea);
                          textarea.focus();
                          
                          console.log(`Added textarea to verification cell for row ${rowIndex + 1} with default text`);
                        } else {
                          // Remove textarea when checkbox is unchecked
                          const existingTextarea = verificationCell.querySelector('textarea');
                          if (existingTextarea) {
                            verificationCell.innerHTML = '';
                            console.log(`Removed textarea from verification cell for row ${rowIndex + 1}`);
                          }
                        }
                      } else {
                        console.log(`Could not find verification cell in row ${rowIndex + 1}`);
                        console.log('Available cells:', Array.from(cells).map(cell => cell.textContent.substring(0, 50)));
                      }
                    };
                    
                    checkboxCell.appendChild(checkbox);
                    row.appendChild(checkboxCell);
                    checkboxesAdded = true;
                    console.log(`Added checkbox to row ${rowIndex + 1} in fallback table`);
                  }
                });
              }
            }
          }
        });
        
        return checkboxesAdded;
      };

      // Try multiple times with different strategies
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryAddCheckboxes = () => {
        attempts++;
        console.log(`Attempt ${attempts} to add checkboxes...`);
        
        const success = forceAddCheckboxes();
        
        if (success) {
          console.log('Checkboxes added successfully!');
        } else if (attempts < maxAttempts) {
          console.log(`Attempt ${attempts} failed, retrying in ${attempts * 100}ms...`);
          setTimeout(tryAddCheckboxes, attempts * 100);
        } else {
          console.log('Max attempts reached. Checkboxes may not have been added.');
        }
      };

      // Start the process immediately and also after a delay
      tryAddCheckboxes();
      
      // Also try after a longer delay to catch any late-rendering content
      setTimeout(() => {
        console.log('Trying delayed checkbox addition...');
        forceAddCheckboxes();
      }, 1000);
      
      // And one more time after 2 seconds
      setTimeout(() => {
        console.log('Trying final checkbox addition...');
        forceAddCheckboxes();
      }, 2000);
    }
  }, [aiReviewContent]);

  const handleSaveContractData = async () => {
    setIsSaving(true);
    try {
      if (!selectedFile) {
        alert('Please select a file first.');
        return;
      }

      // Allow both PDF and DOCX
      const isPDF = selectedFile.type === 'application/pdf';
      const isDocx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                     selectedFile.name.toLowerCase().endsWith('.docx');
      if (!isPDF && !isDocx) {
        alert('Please select a PDF or Word (.docx) file.');
        return;
      }

      // Generate unique contract_review_id
      const contract_review_id = generateContractReviewId();
      console.log('Generated contract_review_id:', contract_review_id);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          let documentText = '';
          if (isPDF) {
            // Extract text from PDF
            const pdf = await getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;
            for (let i = 1; i <= numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              documentText += pageText + '\n';
            }
          } else if (isDocx) {
            // Extract text from DOCX
            const result = await mammoth.extractRawText({ arrayBuffer });
            documentText = result.value;
          }

          console.log('Extracted Document Text:', documentText);

          // Save the original document text to the database with contract_review_id
          const { data, error } = await supabase
            .from('master_contract')
            .insert([
              {
                user_email: user?.email || 'unknown@example.com',
                user_role: user?.role || 'user',
                session_token: user?.sessionToken || 'no-token',
                original_pdf_text: documentText,
                contract_name: selectedFile.name,
                contract_review_id: contract_review_id,
                status: 'pending'
              }
            ]);

          if (error) {
            console.error('Error saving contract to database:', error);
            alert('Error saving contract to database: ' + error.message);
            return;
          }

          console.log('Contract saved to database:', data);

          // Fetch the contract back from the database and log the result
          try {
            const { data: fetchedContract, error: fetchError } = await supabase
              .from('master_contract')
              .select('*')
              .eq('user_email', user?.email || 'unknown@example.com')
              .eq('contract_review_id', contract_review_id);
            if (fetchError) {
              console.error('Error fetching contract after save:', fetchError);
            } else {
              console.log('Fetched contract after save:', fetchedContract);
            }
          } catch (fetchEx) {
            console.error('Exception fetching contract after save:', fetchEx);
          }

          // Extract data from table B
          const tableBData = extractTableBData();
          console.log('Extracted table B data:', tableBData);

          // Save table B data to contract_updates table with contract_review_id
          await saveContractUpdatesToDatabase(tableBData, documentText, contract_review_id);

          // Success message after database operations are complete
          alert(`Contract review data has been successfully saved to database with ID: ${contract_review_id}`);
          
          // Navigate to the contract-review-update route with user email and contract_review_id
          navigate('/contract-review-update', {
            state: {
              userEmail: user?.email || 'unknown@example.com',
              contractReviewId: contract_review_id
            }
          });
        } catch (error) {
          console.error('Error processing contract data:', error);
          alert('Error processing contract data.');
        } finally {
          setIsSaving(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
        setIsSaving(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error in save contract data:', error);
      alert('Error in save contract data.');
      setIsSaving(false);
    }
  };

  const extractTableBData = () => {
    const tableBData = [];
    
    try {
      console.log('Starting table B data extraction...');
      
      // Ensure aiReviewContent is rendered and available
      if (!aiReviewRef.current) {
        console.warn('aiReviewRef.current is null. AI review content might not be rendered yet. Retrying in a moment...');
        // You might want to add a small delay and re-run this function if this happens frequently
        return [];
      }

      let targetTable = null;
      const tablesInAiReview = aiReviewRef.current.querySelectorAll('table');
      console.log(`Found ${tablesInAiReview.length} tables within aiReviewRef.current`);

      // First, try to find Table B within the specific AI review content area
      for (let i = 0; i < tablesInAiReview.length; i++) {
        const table = tablesInAiReview[i];
        const tableText = table.textContent.toLowerCase();
        // console.log(`Table ${i + 1} in AI review content HTML (first 500 chars):`, table.innerHTML.substring(0, 500));
        
        const hasRelevantKeywords = tableText.includes('recommended legal amendments') || 
                                    tableText.includes('clause revisions') ||
                                    tableText.includes('b)') ||
                                    (tableText.includes('amendment') && tableText.includes('revision') && tableText.includes('clause'));
        const hasCheckboxes = table.querySelector('input[type="checkbox"]') !== null;
        const hasInputVerificationColumn = tableText.includes('input verification of amendments') || tableText.includes('verification');

        if (hasRelevantKeywords || hasCheckboxes || hasInputVerificationColumn) {
          console.log(`Identified potential table B at index ${i} within aiReviewRef.current based on keywords/checkboxes/input verification.`);
          targetTable = table;
          break; 
        }
      }

      // If not found in aiReviewRef, search globally for a table with checkboxes
      if (!targetTable) {
        console.log('Table B not found in AI review content area. Looking for tables with checkboxes anywhere in the document.');
        const allTables = document.querySelectorAll('table');
        console.log(`Found ${allTables.length} tables in the entire document.`);

        for (let i = 0; i < allTables.length; i++) {
          const table = allTables[i];
          const hasCheckboxes = table.querySelector('input[type="checkbox"]') !== null;
          const tableText = table.textContent.toLowerCase();
          // console.log(`Global Table ${i + 1} HTML (first 500 chars):`, table.innerHTML.substring(0, 500));

          if (hasCheckboxes) {
            console.log(`Identified potential table B at global index ${i} due to presence of checkboxes.`);
            targetTable = table;
            break;
          }
        }
      }

      if (targetTable) {
        extractDataFromTable(targetTable, tableBData, 'identified');
      } else {
        console.log('No suitable table identified as Table B.');
      }
      
      console.log(`Total rows extracted from table B: ${tableBData.length}`);
      console.log('Final table B data:', tableBData);
      
      if (tableBData.length === 0) {
        console.warn('No data was extracted for Table B. Please ensure the AI review content correctly renders Table B with the expected structure and input fields.');
      }
      
      return tableBData;
    } catch (error) {
      console.error('Fatal error during table B data extraction:', error);
      return [];
    }
  };

  const extractDataFromTable = (table, tableBData, tableIdentifier = '') => {
    // Get header cells to map columns by their text
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const headers = headerCells.map(th => th.textContent.toLowerCase().trim());
    console.log(`Table ${tableIdentifier} Headers:`, headers);

    // Define column mapping with more robust fallbacks
    const colMap = {
      contractualReference: headers.findIndex(h => h.includes('contractual reference')),
      recommendedLegalAmendment: headers.findIndex(h => h.includes('recommended legal amendment')),
      originalClause: headers.findIndex(h => h.includes('original clause')),
      inputVerificationOfAmendments: headers.findIndex(h => h.includes('input verification of amendments') || h.includes('verification')),
      revisedClause: headers.findIndex(h => h.includes('revised clause') || h.includes('formal legal language') || h.includes('recommended amendment'))
    };

    // Apply fallback indices if specific headers are not found
    colMap.contractualReference = colMap.contractualReference !== -1 ? colMap.contractualReference : 0;
    colMap.recommendedLegalAmendment = colMap.recommendedLegalAmendment !== -1 ? colMap.recommendedLegalAmendment : 1;
    colMap.originalClause = colMap.originalClause !== -1 ? colMap.originalClause : 2;
    colMap.inputVerificationOfAmendments = colMap.inputVerificationOfAmendments !== -1 ? colMap.inputVerificationOfAmendments : 3;
    colMap.revisedClause = colMap.revisedClause !== -1 ? colMap.revisedClause : 4; 
    
    console.log(`Final Column Mapping for table ${tableIdentifier}:`, colMap);

    // Get all rows in the table, excluding header rows
    // Look for rows within tbody first, then fallback to all tr elements directly under the table
    let rows = Array.from(table.querySelectorAll('tbody tr'));
    if (rows.length === 0) {
      console.log(`No tbody rows found for table ${tableIdentifier}, trying direct tr children.`);
      rows = Array.from(table.querySelectorAll(':scope > tr')).filter(row => row.parentElement.tagName !== 'THEAD');
    }
    console.log(`Found ${rows.length} data rows for table ${tableIdentifier}.`);
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      // Ensure the row has a checkbox if we are specifically looking for checked rows (though we want all in B)
      const hasCheckbox = row.querySelector('input[type="checkbox"]') !== null;
      const checkboxChecked = row.querySelector('input[type="checkbox"]:checked') !== null;

      // Only process rows that have enough cells for our required data, and optionally a checkbox
      const minCellsRequired = Math.max(
        colMap.contractualReference,
        colMap.recommendedLegalAmendment,
        colMap.originalClause,
        colMap.inputVerificationOfAmendments,
        colMap.revisedClause
      ) + 1;

      if (cells.length >= minCellsRequired) {
        const contractualReference = cells[colMap.contractualReference]?.textContent?.trim() || '';
        const recommendedLegalAmendment = cells[colMap.recommendedLegalAmendment]?.textContent?.trim() || '';
        const originalClause = cells[colMap.originalClause]?.textContent?.trim() || '';
        
        let inputVerification = '';
        const inputVerificationCell = cells[colMap.inputVerificationOfAmendments];

        if (inputVerificationCell) {
          const textarea = inputVerificationCell.querySelector('textarea');
          if (textarea) {
            inputVerification = textarea.value.trim();
            // console.log(`Found textarea value for row ${rowIndex + 1}: ${inputVerification.substring(0, 50)}...`);
          } else {
            inputVerification = inputVerificationCell.textContent.trim();
            // console.log(`Using cell text for row ${rowIndex + 1}: ${inputVerification.substring(0, 50)}...`);
          }
        }

        // Get default text for input verification from revised clause if available and input verification is empty
        if (!inputVerification && colMap.revisedClause !== -1) {
          const revisedClauseText = cells[colMap.revisedClause]?.textContent?.trim() || '';
          if (revisedClauseText) {
            inputVerification = revisedClauseText;
            // console.log(`Auto-filled Input Verification for row ${rowIndex + 1} from Revised Clause: ${inputVerification.substring(0, 50)}...`);
          }
        }
        
        // Only add if we have meaningful data from the main columns OR if the row has a checked checkbox
        if (contractualReference || recommendedLegalAmendment || originalClause || checkboxChecked) {
          const rowData = {
            contractualReference,
            recommendedLegalAmendment,
            originalClause,
            inputVerification,
            // Add a flag to indicate if this row was checked by the user
            isChecked: checkboxChecked
          };
          
          tableBData.push(rowData);
          console.log(`Extracted row ${rowIndex + 1} from table ${tableIdentifier}:`, rowData);
        } else {
          console.log(`Skipping row ${rowIndex + 1} in table ${tableIdentifier} - no meaningful data in core columns or checked checkbox.`);
        }
      } else {
        console.log(`Skipping row ${rowIndex + 1} in table ${tableIdentifier} - insufficient cells (${cells.length}). Expected at least ${minCellsRequired} cells.`);
      }
    });
  };

  const saveContractUpdatesToDatabase = async (tableBData, pdfText, contract_review_id) => {
    try {
      console.log('Starting to save contract updates to database...');
      console.log('Table B data received:', tableBData);
      console.log('PDF text length:', pdfText?.length || 0);
      
      if (!tableBData || tableBData.length === 0) {
        console.log('No table B data to save');
        alert('No table B data found to save. Please make sure the AI review has completed and table B is visible.');
        return;
      }

      if (!pdfText) {
        console.log('No PDF text provided');
        alert('No PDF text available for saving.');
        return;
      }

      // First, check if the contract_updates table exists
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('contract_updates')
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error('Table check error:', tableError);
          if (tableError.code === '42P01') { // Table doesn't exist
            alert('The contract_updates table does not exist in your Supabase database. Please create it first using the SQL script provided.');
            return;
          }
        }
        console.log('Table check successful, contract_updates table exists');
      } catch (checkError) {
        console.error('Error checking table existence:', checkError);
        alert('Error checking database table. Please ensure the contract_updates table exists.');
        return;
      }

      // Prepare data for insertion
      const insertData = tableBData.map((row, index) => {
        const dataRow = {
          user_email: user?.email || 'unknown@example.com',
          user_role: user?.role || 'user',
          session_token: user?.sessionToken || 'no-token',
          original_pdf_text: pdfText,
          contractual_reference: row.contractualReference || '',
          recommended_legal_amendment: row.recommendedLegalAmendment || '',
          original_clause: row.originalClause || '',
          input_verification_of_amendments: row.inputVerification || '',
          contract_name: selectedFile?.name || 'unknown_contract',
          contract_review_id: contract_review_id,
          status: 'pending'
        };
        
        console.log(`Prepared row ${index + 1} for insertion:`, dataRow);
        return dataRow;
      });

      console.log('Prepared insert data:', insertData);

      // Insert data into contract_updates table
      const { data, error } = await supabase
        .from('contract_updates')
        .insert(insertData);

      if (error) {
        console.error('Error saving contract updates to database:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert('Error saving contract updates to database: ' + error.message);
        return;
      }

      console.log('Contract updates saved to database successfully:', data);
      alert(`Successfully saved ${tableBData.length} contract updates to database!`);
    } catch (error) {
      console.error('Error in saveContractUpdatesToDatabase:', error);
      console.error('Error stack:', error.stack);
      alert('Error saving contract updates: ' + error.message);
    }
  };

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Contract Review System</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleFileUpload}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>Upload Contract for Review</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange} 
                    disabled={isProcessing} 
                  />
                  <Form.Text className="text-muted">
                    Upload a PDF or Word (.docx) contract file for AI-powered review and analysis.
                  </Form.Text>
                </Form.Group>
                <Button variant="primary" type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Reviewing Contract...
                    </>
                  ) : (
                    'Start Review'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Review Data card hidden as requested
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Review Data</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Contract Name</th>
                    <th>Review Date</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Summary</th>
                    <th>Full Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewHistory.map((review) => (
                    <tr key={review.id}>
                      <td>{review.contractName}</td>
                      <td>{review.reviewDate}</td>
                      <td>{getStatusBadge(review.status)}</td>
                      <td>{review.reviewer}</td>
                      <td>{review.summary}</td>
                      <td>
                        {review.fullReview && review.fullReview.length > 100 ? (
                          <div>
                            <div style={{ maxHeight: '100px', overflow: 'hidden' }}>
                              {review.fullReview.substring(0, 100)}...
                            </div>
                            <Button 
                              variant="link" 
                              size="sm" 
                              onClick={() => {
                                // You can implement a modal or expandable view here
                                alert(review.fullReview);
                              }}
                            >
                              View Full Review
                            </Button>
                          </div>
                        ) : (
                          <div>{review.fullReview}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      */}

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">AI Review</Card.Title>
            </Card.Header>
            <Card.Body>
              {aiReviewContent ? (
                <div className="ai-review-content" ref={aiReviewRef}>
                  <div dangerouslySetInnerHTML={{ __html: aiReviewContent }} />
                </div>
              ) : (
                <p className="text-muted">AI Review content will appear here after processing a contract.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12} className="text-start">
          <Button 
            variant="success" 
            size="lg"
            onClick={handleSaveContractData}
            disabled={isSaving}
            style={{ marginTop: '20px', marginBottom: '20px' }}
          >
            {isSaving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Saving Contract Data...
              </>
            ) : (
              'Save Contract Review Data'
            )}
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default ContractReview; 