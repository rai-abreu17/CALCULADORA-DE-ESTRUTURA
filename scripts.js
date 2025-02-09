// Função para adicionar uma nova linha (haste) à tabela
function addRodRow() {
  const tbody = document.querySelector('#rodsTable tbody');
  const tr = document.createElement('tr');
  
  // Célula: Identificador
  const tdId = document.createElement('td');
  const inputId = document.createElement('input');
  inputId.type = 'text';
  inputId.placeholder = 'Ex.: AB';
  tdId.appendChild(inputId);
  tr.appendChild(tdId);
  
  // Célula: Diâmetro (mm)
  const tdDia = document.createElement('td');
  const inputDia = document.createElement('input');
  inputDia.type = 'number';
  inputDia.placeholder = 'Ex.: 9';
  tdDia.appendChild(inputDia);
  tr.appendChild(tdDia);
  
  // Célula: Ângulo (graus) – opcional
  const tdAngle = document.createElement('td');
  const inputAngle = document.createElement('input');
  inputAngle.type = 'number';
  inputAngle.placeholder = 'Ex.: 56.466 (opcional)';
  tdAngle.appendChild(inputAngle);
  tr.appendChild(tdAngle);
  
  // Célula: Usar Equilíbrio?
  const tdEq = document.createElement('td');
  const inputEq = document.createElement('input');
  inputEq.type = 'checkbox';
  tdEq.appendChild(inputEq);
  tr.appendChild(tdEq);
  
  // Célula: Força Manual (N) – opcional
  const tdForce = document.createElement('td');
  const inputForce = document.createElement('input');
  inputForce.type = 'number';
  inputForce.placeholder = 'Opcional';
  tdForce.appendChild(inputForce);
  tr.appendChild(tdForce);
  
  // Célula: Ação (botão para remover a linha)
  const tdAction = document.createElement('td');
  const btnRemove = document.createElement('button');
  btnRemove.textContent = 'Remover';
  btnRemove.className = 'remove-btn';
  btnRemove.onclick = function() {
    tr.remove();
  };
  tdAction.appendChild(btnRemove);
  tr.appendChild(tdAction);
  
  tbody.appendChild(tr);
}

// Função que coleta os dados, resolve as forças e calcula as tensões
function solveCalculator() {
  const globalLoad = parseFloat(document.getElementById('globalLoad').value);
  if (isNaN(globalLoad)) {
    alert("Por favor, insira a carga aplicada.");
    return;
  }
  
  const angleOrientation = document.getElementById('globalAngleOrientation').value;
  
  // Coleta os dados de cada haste
  const rows = document.querySelectorAll('#rodsTable tbody tr');
  const rods = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    // Ordem: Identificador, Diâmetro, Ângulo, Checkbox, Força Manual.
    const id = inputs[0].value.trim();
    const diameter = parseFloat(inputs[1].value);
    let angleInput = inputs[2].value.trim();
    let angle = angleInput === "" ? null : parseFloat(angleInput);
    const useEquilibrium = inputs[3].checked;
    const manualForce = inputs[4].value.trim() === "" ? null : parseFloat(inputs[4].value);
    
    // Se faltar algum dado essencial (Identificador ou Diâmetro), ignora a linha
    if (!id || isNaN(diameter)) {
      return;
    }
    
    // Se o ângulo foi informado e se a referência for "vertical", converte para ângulo em relação à horizontal.
    if (angle !== null && angleOrientation === 'vertical') {
      angle = 90 - angle;
    }
    const angleRad = (angle !== null) ? angle * Math.PI / 180 : null;
    
    // Se a haste estiver marcada para equilíbrio, mas não possuir ângulo, alerta o usuário.
    if (useEquilibrium && angleRad === null) {
      alert("Para a haste " + id + " marcada para equilíbrio, o ângulo é necessário.");
      return;
    }
    
    rods.push({
      id: id,
      diameter: diameter,
      angleDeg: angle,    // pode ser null
      angleRad: angleRad, // pode ser null
      useEquilibrium: useEquilibrium,
      manualForce: manualForce,
      force: null,  // força a ser determinada
      stress: null, // tensão (stress) a ser calculada
    });
  });
  
  // Separação dos grupos
  const manualRods = rods.filter(r => r.manualForce !== null);
  const eqRods = rods.filter(r => r.manualForce === null && r.useEquilibrium);
  const otherRods = rods.filter(r => r.manualForce === null && !r.useEquilibrium);
  
  // Se houver exatamente duas hastes para equilíbrio, resolvemos as equações
  if (eqRods.length === 2) {
    const theta1 = eqRods[0].angleRad;
    const theta2 = eqRods[1].angleRad;
    const ratio = Math.cos(theta2) / Math.cos(theta1);
    const F2 = globalLoad / (ratio * Math.sin(theta1) + Math.sin(theta2));
    const F1 = ratio * F2;
    eqRods[0].force = F1;
    eqRods[1].force = F2;
  } else if (eqRods.length > 0) {
    alert("Para o cálculo de equilíbrio, exatamente 2 hastes devem ser marcadas para equilíbrio (sem força manual).");
    return;
  }
  
  // Para as hastes que não estão em equilíbrio e não têm força manual:
  if (otherRods.length === 1) {
    otherRods[0].force = globalLoad;
  } else if (otherRods.length > 1) {
    alert("Mais de uma haste sem força manual e sem equilíbrio. Por favor, defina a força manual para elas.");
    return;
  }
  
  // Para as hastes com força manual, usamos o valor informado
  manualRods.forEach(r => {
    r.force = r.manualForce;
  });
  
  // Calcula a tensão para cada haste: σ = F / A, onde A = (π/4)*(d em m)²
  rods.forEach(r => {
    if (r.force === null) {
      r.stress = null;
    } else {
      const d_m = r.diameter / 1000; // converter mm para m
      const area = Math.PI * Math.pow(d_m, 2) / 4;
      r.stress = r.force / area; // tensão em Pa
    }
  });
  
  // Monta a tabela de resultados
  let resultHTML = "<table class='result-table'><thead><tr><th>Haste</th><th>Força (N)</th><th>Tensão (MPa)</th></tr></thead><tbody>";
  rods.forEach(r => {
    resultHTML += `<tr>
      <td>${r.id}</td>
      <td>${r.force !== null ? r.force.toFixed(2) : "N/A"}</td>
      <td>${r.stress !== null ? (r.stress/1e6).toFixed(2) : "N/A"}</td>
      </tr>`;
  });
  resultHTML += "</tbody></table>";
  
  document.getElementById('results').innerHTML = resultHTML;
}
