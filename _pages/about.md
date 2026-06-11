---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

Hello👋! I am Zijian Zhou (周仔谏), a Ph.D. student in the School of Computer Science and Engineering at the University of Electronic Science and Technology of China (UESTC), Chengdu, China, starting from Spring 2026. I am advised by Prof. Malu Zhang (张马路). Currently, I am also participating in a joint Ph.D. program at the Shenzhen Loop Area Institute.

My research interests broadly encompass Multimodal Large Language Models, Brain-inspired Computing, Spiking Neural Networks, Model Compression, etc. I have published papers in leading AI conferences and journals, including ICML, ICLR, NeurIPS, AAAI, and IJCAI. My Google Scholar citation record is available here <a href='https://scholar.google.com/citations?user=1VlWbnMAAAAJ'><img src="https://img.shields.io/endpoint?url={{ url | url_encode }}&logo=Google%20Scholar&labelColor=f6f6f6&color=9cf&style=flat&label=citations" alt="Google Scholar citations"></a>.

Telegram/Wechat: (+86) 13032875612. Please feel free to reach out to me.

# 📖 Educations
- *2020.09 - 2024.06*, B.Eng. in Artificial Intelligence (School of Computer Science and Engineering, University of Electronic Science and Technology of China)
- *2024.09 - 2026.03*, M.Eng. in Computer Technology (School of Computer Science and Engineering, University of Electronic Science and Technology of China)
- *2026.03 - 2029.06 (Expected)*, Ph.D. Student in Computer Science and Technology (School of Computer Science and Engineering, University of Electronic Science and Technology of China)

# 🎖 Honors and Awards
- *2021.12* National Scholarship (国家奖学金)
- *2022.12* National Scholarship (国家奖学金)
- *2023.12* National Scholarship (国家奖学金)
- *2025.12* National Scholarship (国家奖学金)
- *2024.3* Outstanding Graduate of Sichuan Province (四川省优秀大学毕业生)
- *2023.5* Outstanding Winner and Leonhard Euler Award in the Interdisciplinary Contest in Modeling (美国大学生数学建模竞赛O奖)

# 💻 Internships
- *2025.12 - Current*, [ModelBest](https://www.modelbest.cn/). 
Multimodal Group, Basic Modeling Department. Research aims to improve the grounding and counting capabilities of Multimodal Large Language Models.

# 💬 Academic Services
- Conference Reviewer: NeurIPS 2025, AAAI 2026, ICLR 2026, ICML 2026 (Gold Reviewer Award), NeurIPS 2026, etc.
- Journal Reviewer: Transactions on Machine Learning Research, IEEE Transactions on Cognitive and Developmental Systems, etc.

# 📝 Publications

## First Author

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">ICML 2026</div><img src='images/smoothspike.png' alt="SmoothSpike" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

SmoothSpike: Spiking Transformer with Learnable Hadamard Transformation <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> <img src="https://img.shields.io/badge/Spotlight-purple" alt="Spotlight" />

**Zijian Zhou**, Wenjie Wei, Yu Liang, Jialin Li, Ammar Belatreche, Honglin Cao, Shuai Wang, Malu Zhang, Yang Yang, Haizhou Li

- SmoothSpike enhances the representational capacity of spiking transformers by suppressing spike saturation with a learnable Hadamard transformation.

- [<img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&logoColor=000" alt="Paper" />](https://icml.cc/virtual/2026/poster/63665)
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">ICML 2026</div><img src='images/pelif.png' alt="PeLIF" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

Positional Encoding for Spiking Transformers <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" />

**Zijian Zhou**, Yu Liang, Honglin Cao, Ammar Belatreche, Jieyuan Zhang, Wenjie Wei, Shuai Wang, Malu Zhang, Yang Yang, Haizhou Li

- This work introduces Spiking Positional Encoding with a PE-LIF neuron layer, embedding positional information into neuron thresholds while preserving spike-driven computation.

- [<img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&logoColor=000" alt="Paper" />](https://icml.cc/virtual/2026/poster/61080)
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">ICML 2026</div><img src='images/adas.png' alt="AdaS" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

AdaS: Adaptive Gradient Descent for Spiking Transformers <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" />

**Zijian Zhou**, Honglin Cao, Ammar Belatreche, Wenjie Wei, Yimeng Shan, Yu Liang, Yu Yang, Shuai Wang, Yalan Ye, Malu Zhang, Yang Yang, Haizhou Li

- AdaS analyzes noisy surrogate-gradient updates in spiking transformers and adaptively controls update-direction noise to improve training stability and performance.

- [<img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&logoColor=000" alt="Paper" />](https://icml.cc/virtual/2026/poster/62239)
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">IJCAI 2025</div><img src='images/bestformer.png' alt="BESTformer" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

Binary Event-Driven Spiking Transformer <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" />

Honglin Cao\*, **Zijian Zhou**\*, Wenjie Wei, Ammar Belatreche, Yu Liang, Dehao Zhang, Malu Zhang, Yang Yang, Haizhou Li

- BESTformer integrates binarization into event-driven spiking transformers for compact and efficient neuromorphic vision models.

- [<img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&logoColor=000" alt="Paper" />](https://www.ijcai.org/proceedings/2025/0458.pdf) \| [<img src="https://img.shields.io/badge/Code-fff?logo=github&logoColor=000" alt="Code" />](https://github.com/CaoHLin/BESTFormer)
</div>
</div>

## Co-Author

<ul>
  <li>
      <p><img src="https://img.shields.io/badge/NeurIPS-green" alt="NeurIPS" /> <img src="https://img.shields.io/badge/2024-yellow" alt="2024" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> Spike-based Neuromorphic Model for Sound Source Localization. <a href="https://proceedings.neurips.cc/paper_files/paper/2024/hash/ce953d71deeb33d9ffa2c879b518d273-Abstract-Conference.html"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
  <br /> Dehao Zhang, Shuai Wang, Ammar Belatreche, Wenjie Wei, Yichen Xiao, Haorui Zheng, <strong>Zijian Zhou</strong>, Malu Zhang, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/AAAI-green" alt="AAAI" /> <img src="https://img.shields.io/badge/2025-yellow" alt="2025" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> Towards Accurate Binary Spiking Neural Networks: Learning with Adaptive Gradient Modulation Mechanism. <a href="https://ojs.aaai.org/index.php/AAAI/article/view/32130"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Yu Liang, Wenjie Wei, Ammar Belatreche, Honglin Cao, <strong>Zijian Zhou</strong>, Shuai Wang, Malu Zhang, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/ICLR-green" alt="ICLR" /> <img src="https://img.shields.io/badge/2025-yellow" alt="2025" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> QP-SNN: Quantized and Pruned Spiking Neural Networks. <a href="https://openreview.net/forum?id=MiPyle6Jef"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Wenjie Wei, Malu Zhang, <strong>Zijian Zhou</strong>, Ammar Belatreche, Yimeng Shan, Yu Liang, Honglin Cao, Jieyuan Zhang, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/IEEE--CIM-green" alt="IEEE CIM" /> <img src="https://img.shields.io/badge/2025-yellow" alt="2025" /> Toward Energy-Efficient Spike-Based Deep Reinforcement Learning With Temporal Coding. <a href="https://doi.org/10.1109/MCI.2025.3541572"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Malu Zhang, Shuai Wang, Jibin Wu, Wenjie Wei, Dehao Zhang, <strong>Zijian Zhou</strong>, Siying Wang, Fan Zhang, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/IEEE--TEVC-green" alt="IEEE TEVC" /> <img src="https://img.shields.io/badge/2025-yellow" alt="2025" /> Spike-Driven Lightweight Large Language Model With Evolutionary Computation. <a href="https://doi.org/10.1109/TEVC.2025.3606613"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Malu Zhang, Wenjie Wei, <strong>Zijian Zhou</strong>, Wanlong Liu, Jie Zhang, Ammar Belatreche, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/AAAI-green" alt="AAAI" /> <img src="https://img.shields.io/badge/2026-yellow" alt="2026" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> Towards Training-Free and Accurate ANN-to-SNN Conversion via Activation-Aware Redistribution. <a href="https://ojs.aaai.org/index.php/AAAI/article/view/37148"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Honglin Cao, Shuai Wang, <strong>Zijian Zhou</strong>, Ammar Belatreche, Wenjie Wei, Yu Liang, Yu Yang, Rui Xi, Malu Zhang, Haizhou Li</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/ICLR-green" alt="ICLR" /> <img src="https://img.shields.io/badge/2026-yellow" alt="2026" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> TP-Spikformer: Token Pruned Spiking Transformer. <a href="https://openreview.net/forum?id=L5llQD0nMf"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Wenjie Wei, Xiaolong Zhou, Malu Zhang, Ammar Belatreche, Qian Sun, Yimeng Shan, Dehao Zhang, <strong>Zijian Zhou</strong>, Zeyu Ma, Yang Yang, Haizhou Li</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/ICLR-green" alt="ICLR" /> <img src="https://img.shields.io/badge/2026-yellow" alt="2026" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> Robust Spiking Neural Networks Against Adversarial Attacks. <a href="https://openreview.net/forum?id=qTqAL2t8Aa"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Shuai Wang, Malu Zhang, Yulin Jiang, Dehao Zhang, Ammar Belatreche, Yu Liang, Yimeng Shan, <strong>Zijian Zhou</strong>, Yang Yang, Haizhou Li</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/ICASSP-green" alt="ICASSP" /> <img src="https://img.shields.io/badge/2026-yellow" alt="2026" /> <img src="https://img.shields.io/badge/CCF--B-darkblue" alt="CCF-B" /> Towards Efficient Spiking Neural Networks: A Reliable Structured Pruning Criterion. <a href="https://ieeexplore.ieee.org/document/11461709"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Hanwen Liu, <strong>Zijian Zhou</strong>, Kexin Shi, Wenjie Wei, Wenyu Chen, Jibin Wu, Malu Zhang, Yang Yang</p>
  </li>
  <li>
    <p><img src="https://img.shields.io/badge/ICML-green" alt="ICML" /> <img src="https://img.shields.io/badge/2026-yellow" alt="2026" /> <img src="https://img.shields.io/badge/CCF--A-darkblue" alt="CCF-A" /> SpikingLM: Towards Fully Spiking Language Model. <a href="https://icml.cc/virtual/2026/poster/64012"><img src="https://img.shields.io/badge/Paper-fff?logo=readthedocs&amp;logoColor=000" alt="Paper" /></a>
<br /> Yu Liang, <strong>Zijian Zhou</strong>, Wenjie Wei, Shuai Wang, Honglin Cao, Ammar Belatreche, Yu Yang, Malu Zhang, Yang Yang, Haizhou Li</p>
  </li>
</ul>
