#!/usr/bin/env python3
"""Generate figures for the dynamical systems blog post - ggplot minimal style."""

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint

# Clean ggplot-minimal style
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.size': 11,
    'axes.linewidth': 0.8,
    'axes.edgecolor': '#333333',
    'axes.labelcolor': '#333333',
    'axes.spines.top': False,
    'axes.spines.right': False,
    'figure.facecolor': 'white',
    'axes.facecolor': 'white',
    'xtick.color': '#333333',
    'ytick.color': '#333333',
    'xtick.major.width': 0.8,
    'ytick.major.width': 0.8,
    'text.color': '#333333',
})

# Colors matching Fisher post
BLUE = '#457b9d'
RED = '#e63946'
TEAL = '#2a9d8f'
GRAY = '#888888'

# Parameters
r = 1.0
K = 100

output_dir = '/Users/jeremyschroeter/Desktop/the-ark/personal/blog/website/blog-static/assets/images'

# =============================================================================
# Figure 1: Growth rate plot with phase line arrows on x-axis
# =============================================================================
fig1, ax1 = plt.subplots(figsize=(5, 3.5))

N = np.linspace(0, 120, 500)
dN_dt = r * N * (1 - N / K)

ax1.axhline(y=0, color=GRAY, linewidth=0.6, linestyle='-', zorder=1)

BLACK = '#333333'
ax1.plot(N, dN_dt, linewidth=2, color=BLACK, zorder=3)

# Fixed points on the curve
ax1.plot(0, 0, 'o', markersize=8, color='white', markeredgecolor=BLACK, markeredgewidth=1.5, zorder=5)
ax1.plot(K, 0, 'o', markersize=8, color=BLACK, zorder=5)

# Phase line arrows on x-axis (y=0) - just arrowheads
arrow_y = 0

# Between 0 and K (flow right toward K)
ax1.plot(30, arrow_y, marker='>', markersize=8, color=BLACK, zorder=4)
ax1.plot(70, arrow_y, marker='>', markersize=8, color=BLACK, zorder=4)

# Right of K (flow left toward K)
ax1.plot(115, arrow_y, marker='<', markersize=8, color=BLACK, zorder=4)

ax1.set_xlabel('N')
ax1.set_ylabel(r'$\dot{N}$')
ax1.set_xlim(-5, 125)
ax1.set_ylim(-18, 30)
ax1.set_xticks([0, 50, 100])
ax1.set_xticklabels(['0', 'K/2', 'K'])
ax1.set_yticks([0], [0])
# ax1.set_yticklabels([r'$\dot{N}=0$'])

plt.tight_layout()
fig1.savefig(f'{output_dir}/logistic_growth_rate.svg', format='svg', bbox_inches='tight', transparent=True)
fig1.savefig(f'{output_dir}/logistic_growth_rate.png', format='png', dpi=150, bbox_inches='tight', transparent=True)
print('Saved: logistic_growth_rate.svg/png')

# =============================================================================
# Figure 2: Solution curves N(t)
# =============================================================================
fig2, ax2 = plt.subplots(figsize=(5, 3.5))

def logistic(N, t, r, K):
    return r * N * (1 - N / K)

t = np.linspace(0, 10, 200)
initial_conditions = [5, 20, 50, 120, 150]

ax2.axhline(y=K, color=GRAY, linewidth=0.6, linestyle='--', zorder=1)

for N0 in initial_conditions:
    solution = odeint(logistic, N0, t, args=(r, K))
    ax2.plot(t, solution, linewidth=1.8, color=BLACK)

ax2.set_xlabel('t')
ax2.set_ylabel('N')
ax2.set_xlim(0, 10)
ax2.set_ylim(0, 160)
ax2.set_xticks([])
ax2.set_yticks(initial_conditions + [K])
ax2.set_yticklabels([str(n) for n in initial_conditions] + ['K'])

plt.tight_layout()
fig2.savefig(f'{output_dir}/logistic_solutions.svg', format='svg', bbox_inches='tight', transparent=True)
fig2.savefig(f'{output_dir}/logistic_solutions.png', format='png', dpi=150, bbox_inches='tight', transparent=True)
print('Saved: logistic_solutions.svg/png')

# =============================================================================
# Figure 3: 2D Competition Model - Stream Plot
# =============================================================================
fig3, ax3 = plt.subplots(figsize=(5, 5))

# Parameters for competition model (symmetric)
r1, r2 = 1.0, 1.0
K1, K2 = 100, 100
gamma12, gamma21 = 0.5, 0.5

# Grid for streamplot
N1_grid = np.linspace(1, 120, 30)
N2_grid = np.linspace(1, 120, 30)
N1, N2 = np.meshgrid(N1_grid, N2_grid)

dN1 = r1 * N1 * (1 - (N1 + gamma12 * N2) / K1)
dN2 = r2 * N2 * (1 - (N2 + gamma21 * N1) / K2)

ax3.streamplot(N1, N2, dN1, dN2, color=BLACK, linewidth=0.6, density=1.2, arrowsize=0.8)

# Nullclines (clipped by axis limits)
# N1-nullcline: N2 = (K1 - N1) / gamma12, from N1=0 to N1=K1
N1_null1 = np.linspace(0, K1, 100)
ax3.plot(N1_null1, (K1 - N1_null1) / gamma12, linewidth=2, color=BLUE)

# N2-nullcline: N2 = K2 - gamma21 * N1, from N1=0 to N1=K2/gamma21
N1_null2 = np.linspace(0, K2 / gamma21, 100)
ax3.plot(N1_null2, K2 - gamma21 * N1_null2, linewidth=2, color=RED)

ax3.set_xlabel(r'$N_1$')
ax3.set_ylabel(r'$N_2$')
ax3.set_xlim(0, 120)
ax3.set_ylim(0, 120)
ax3.set_xticks([0, K1])
ax3.set_xticklabels(['0', r'$K$'])
ax3.set_yticks([0, K2])
ax3.set_yticklabels(['0', r'$K$'])
ax3.set_aspect('equal')

plt.tight_layout()
fig3.savefig(f'{output_dir}/competition_phase_portrait.svg', format='svg', bbox_inches='tight', transparent=True)
fig3.savefig(f'{output_dir}/competition_phase_portrait.png', format='png', dpi=150, bbox_inches='tight', transparent=True)
print('Saved: competition_phase_portrait.svg/png')

plt.close('all')
print('\nAll figures generated!')
